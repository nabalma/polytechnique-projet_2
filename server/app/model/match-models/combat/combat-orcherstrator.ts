import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { Combat } from '@app/model/match-models/combat/combat';
import { Timer } from '@app/model/match-models/timer/timer';
import { MovementService } from '@app/services/match/movement/movement.service';
import { COMBAT_ROUND_DURATION, VIRTUAL_POSTURE_DELAY_MS } from '@common/constants/timer/timer-constants';
import { Posture } from '@common/enum/match/match.enum';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import {
    EndCombatUpdates,
    RequestAttackPayload,
    RoundEndedPayload,
    RoundEndedResult,
} from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { BotProfile } from '@common/interfaces/types';
import { LogsEvent } from '@common/socket_event/logs/logs.gateway.events';
import { MatchEvents, TimerEvents } from '@common/socket_event/match/match.gateway.events';

export class CombatOrchestrator {
    private combatState: Combat | null = null;
    private combatRoomId: string | null = null;
    private readonly combatTimer: Timer;

    constructor(
        private readonly gameState: GameState,
        private readonly broadCast: BroadcastService,
        private readonly movementService: MovementService,
        private readonly onCombatOver: (
            winnerId: string | null,
            loserId: string | null,
            loserDefeatPosition: Position | null,
            drawDefeatPositions?: Map<string, Position>,
        ) => void,
    ) {
        this.combatTimer = new Timer(this.onCombatTick);
    }

    get isInCombat(): boolean {
        return this.combatState !== null;
    }

    requestCombat(initiatorId: string, payload: RequestAttackPayload): void {
        const initiator = this.gameState.players.find(player => player.id === initiatorId);
        const opponent = this.gameState.players.find(player => player.id === payload.targetPlayerId);
        if (!initiator || !opponent) return;

        this.combatState = new Combat(initiator, opponent, this.gameState);
        this.combatRoomId = this.broadCast.joinCombatRoom(initiatorId, payload.targetPlayerId);

        this.broadCast.emitToRoom(
            this.gameState.roomId,
            MatchEvents.CombatStarted,
            { initiatorId, oponentId: payload.targetPlayerId },
        );
        this.autoChoosePosturesForVirtualPlayers();
        this.combatTimer.start(COMBAT_ROUND_DURATION, this.onCombatRoundEnd);
    }

    choosePosture(playerId: string, posture: Posture): void {
        if (!this.combatState || !posture) return;
        const allChosen = this.combatState.setPosture(playerId, posture);
        if (allChosen) {
            this.onCombatRoundEnd();
        }
    }

    private onCombatTick = (seconds: number): void => {
        this.broadCast.emitToRoom(this.gameState.roomId, TimerEvents.CombatTick, { seconds });
    };

    private onCombatRoundEnd = (): void => {
        this.combatTimer.stop();
        if (!this.combatState) return;

        const result: RoundEndedResult = this.combatState.resolveRound();

        const { loserDefeatPosition, drawDefeatPositions } = this.applyPostRoundUpdates(result);

        const payload: RoundEndedPayload = {
            ...result,
            playersUpdate: this.buildPlayersUpdate(result.loserId, result.isCombatOver),
        };

        this.broadCast.emitToRoom(this.gameState.roomId, MatchEvents.RoundEnded, payload);
        this.sendVirtualCombatResult(result.winnerId, result.loserId);
        this.sendCombatInformation();

        if (result.isCombatOver) {
            this.endCombat(result.winnerId, result.loserId, loserDefeatPosition, drawDefeatPositions);
        } else {
            this.combatState.startRound();
            this.autoChoosePosturesForVirtualPlayers();
            this.combatTimer.start(COMBAT_ROUND_DURATION, this.onCombatRoundEnd);
        }
    };

    private sendCombatInformation() {
        const initiatorLog = this.combatState.initiatorLog;
        const opponentLog = this.combatState.opponentLog;
        this.broadCast.emitToSocket(initiatorLog.playerId, MatchEvents.CombatInformation, initiatorLog);
        this.broadCast.emitToSocket(opponentLog.playerId, MatchEvents.CombatInformation, opponentLog);
    }

    private sendVirtualCombatResult(winnerId: string, loserId: string) {
        const winnerPlayer = this.findPlayer(winnerId);
        const loserPlayer = this.findPlayer(loserId);
        if (!winnerPlayer || !loserPlayer) return;
        if (winnerPlayer.isVirtual || loserPlayer.isVirtual) {
            const message = `Fin du combat. Vainqueur : ${winnerPlayer.name}. Défaite de : ${loserPlayer.name}`;
            this.broadCast.emitToRoom(winnerPlayer.roomId, LogsEvent.VirtualLog, message);

        }
    }

    private async autoChoosePosturesForVirtualPlayers(): Promise<void> {
        await new Promise<void>(resolve => setTimeout(resolve, VIRTUAL_POSTURE_DELAY_MS));
        if (!this.combatState) return;
        for (const playerId of this.combatState.playerIds()) {
            const player = this.findPlayer(playerId);
            if (player?.isVirtual) {
                const posture = player.botProfile === BotProfile.AGGRESSIVE ? Posture.Offensive : Posture.Defensive;
                this.choosePosture(playerId, posture);
            }
        }
    }

    private applyPostRoundUpdates(result: RoundEndedResult): {
        loserDefeatPosition: Position | null;
        drawDefeatPositions: Map<string, Position> | null;
    } {
        let loserDefeatPosition: Position | null = null;
        let drawDefeatPositions: Map<string, Position> | null = null;

        if (result.loserId) {
            loserDefeatPosition = this.applyLoserUpdate(result.loserId);
        } else if (result.isCombatOver) {
            drawDefeatPositions = this.applyDrawUpdate();
        }
        if (result.winnerId) this.applyWinnerUpdate(result.winnerId);
        return { loserDefeatPosition, drawDefeatPositions };
    }

    private applyLoserUpdate(loserId: string): Position | null {
        const loser = this.findPlayer(loserId);
        if (!loser) return null;
        const defeatPosition = { ...loser.position };
        loser.position = this.movementService.findRespawnPosition(loser, this.gameState);
        loser.attributes.currentLife = loser.attributes.totalLife;
        return defeatPosition;
    }

    private applyDrawUpdate(): Map<string, Position> {
        const defeatPositions = new Map<string, Position>();
        for (const playerId of this.combatState.playerIds()) {
            const player = this.findPlayer(playerId);
            if (player) {
                defeatPositions.set(playerId, { ...player.position });
                player.position = this.movementService.findRespawnPosition(player, this.gameState);
                player.attributes.currentLife = player.attributes.totalLife;
            }
        }
        return defeatPositions;
    }

    private applyWinnerUpdate(winnerId: string): void {
        const winner = this.findPlayer(winnerId);
        if (!winner) return;
        winner.wins++;
        winner.remainingActions = Math.max(0, winner.remainingActions - 1);
    }

    private endCombat(
        winnerId: string | null,
        loserId: string | null,
        loserDefeatPosition: Position | null,
        drawDefeatPositions: Map<string, Position> | null,
    ): void {
        this.broadCast.emitToRoom(
            this.gameState.roomId,
            MatchEvents.PlayersUpdate,
            { players: this.combatState.fighters });
        this.broadCast.leaveCombatRoom(this.combatRoomId);
        this.combatRoomId = null;
        this.combatState = null;
        this.onCombatOver(winnerId, loserId, loserDefeatPosition, drawDefeatPositions ?? undefined);
    }

    private buildPlayersUpdate(loserId: string | null, isCombatOver: boolean): Record<string, EndCombatUpdates> {
        if (isCombatOver && !loserId) {
            return Object.fromEntries(
                this.combatState.playerIds().map(id => {
                    const player = this.findPlayer(id);
                    return [id, { newPosition: player?.position ?? null, newLife: player?.attributes.currentLife ?? null }];
                }),
            );
        }
        const loser = loserId ? this.findPlayer(loserId) : null;
        return Object.fromEntries(
            this.combatState.playerIds().map(id => [
                id,
                {
                    newPosition: id === loserId && loser ? loser.position : null,
                    newLife: id === loserId && loser ? loser.attributes.currentLife : null,
                },
            ]),
        );
    }

    private findPlayer(playerId: string): Player | undefined {
        return this.gameState.players.find(player => player.id === playerId);
    }
}