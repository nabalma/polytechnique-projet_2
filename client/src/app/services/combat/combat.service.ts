import { computed, inject, Injectable, signal } from '@angular/core';
import { LogService } from '@app/services/logs/logs.service';
import { MapService } from '@app/services/match/map/map.service';
import { MatchService } from '@app/services/match/match.service';
import { MatchPlayerService } from '@app/services/match/player/match-player.service';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import { COMBAT_RESULT_DISMISS_MS, COMBAT_TIMER_MAX, DASH_TOTAL, POSTURE_BONUS } from '@common/constants/match/match.const';
import { TileType } from '@common/enum/game/grid/game-grid.enum';
import { Posture } from '@common/enum/match/match.enum';
import { type CombatParticipantNames, CombatStartedSocketPayload, LogCombat } from '@common/interfaces/game-play/combat/combat.interface';
import {
    EndCombatUpdates, PlayersUpdatePayload, RequestAttackPayload, RoundEndedPayload,
} from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { CombatFighter, CombatResult, RoundValuesPayload } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { MatchEvents, TimerEvents } from '@common/socket_event/match/match.gateway.events';


@Injectable({ providedIn: 'root' })
export class CombatService {
    private readonly socketService = inject(MatchSocketService);
    private readonly matchService = inject(MatchService);
    private readonly mapService = inject(MapService);
    private playersService = inject(MatchPlayerService);
    private logService = inject(LogService);

    readonly isInCombat = signal<boolean>(false);
    readonly initiator = signal<CombatFighter | null>(null);
    readonly opponent = signal<CombatFighter | null>(null);
    readonly lastRoundResult = signal<RoundValuesPayload | null>(null);
    readonly combatResult = signal<CombatResult | null>(null);
    readonly remainingTime = signal<number>(0);
    readonly roundNumber = signal<number>(1);
    readonly selectedPosture = signal<Posture | null>(null);

    readonly isLocalPlayerInCombat = computed(() => {
        const id = this.matchService.currentPlayerId;
        return this.initiator()?.id === id || this.opponent()?.id === id;
    });

    readonly initiatorIsOnIce = computed(() => this.isPlayerOnIce(this.initiator()?.id));
    readonly opponentIsOnIce = computed(() => this.isPlayerOnIce(this.opponent()?.id));

    readonly hasChosenPosture = computed(() => this.selectedPosture() !== null);

    readonly timerDashOffset = computed(() => {
        const ratio = Math.max(0, this.remainingTime()) / COMBAT_TIMER_MAX;
        return DASH_TOTAL - ratio * DASH_TOTAL;
    });

    readonly myRoundValues = computed(() => {
        const result = this.lastRoundResult();
        if (!result) return null;
        return result.results[this.matchService.currentPlayerId] ?? null;
    });

    readonly opponentRoundValues = computed(() => {
        const result = this.lastRoundResult();
        if (!result) return null;
        const opponentId = this.opponent()?.id;
        return opponentId ? (result.results[opponentId] ?? null) : null;
    });

    readonly myBaseValue = computed(() => {
        const id = this.matchService.currentPlayerId;
        const isInitiator = this.initiator()?.id === id;
        const player = this.matchService.players().get(id);
        return isInitiator
            ? (player?.attributes.attack ?? 0)
            : (player?.attributes.defense ?? 0);
    });

    readonly opponentBaseValue = computed(() => {
        const opponent = this.matchService.players().get(this.opponent()?.id ?? '');
        const opponentIsInitiator = this.initiator()?.id === this.opponent()?.id;
        return opponentIsInitiator
            ? (opponent?.attributes.attack ?? 0)
            : (opponent?.attributes.defense ?? 0);
    });

    private handleCombatInformation(logInformation: LogCombat) {
        const players = this.matchService.players();
        const attacker = players.get(logInformation.playerId);
        const initiatorId = this.initiator()?.id ?? '';
        const opponentId = this.opponent()?.id ?? '';
        const defenderId = logInformation.playerId === initiatorId ? opponentId : initiatorId;
        const defender = players.get(defenderId);
        this.logService.addCombatLog(logInformation, attacker?.name ?? '?', defender?.name ?? '?');
    }

    registerListeners(): void {
        this.socketService.on<CombatStartedSocketPayload>(MatchEvents.CombatStarted)
            ?.subscribe((payload) => this.handleCombatStarted(payload));

        this.socketService.on<RoundEndedPayload>(MatchEvents.RoundEnded)
            ?.subscribe((payload) => this.handleRoundEnded(payload));

        this.socketService.on<{ seconds: number }>(TimerEvents.CombatTick)
            ?.subscribe((payload) => this.handleCombatTick(payload.seconds));

        this.socketService.on<PlayersUpdatePayload>(MatchEvents.PlayersUpdate)?.subscribe(
            (payload) => {
                this.playersService.updatePlayers(payload.players);
            },
        );

        this.socketService.on<LogCombat>(MatchEvents.CombatInformation)?.subscribe(
            (payload) => this.handleCombatInformation(payload),
        );
    }

    getPostureBonus(posture: Posture | null): number {
        return posture !== null ? POSTURE_BONUS : 0;
    }

    choosePosture(posture: Posture): void {
        this.selectedPosture.set(posture);
        this.socketService.send(MatchEvents.ChoosePosture, { posture });
    }

    dismissResult(): void {
        this.combatResult.set(null);
        this.isInCombat.set(false);
    }

    startCombat(): void {
        const selectedCell = this.matchService.selectedCell;
        if (selectedCell === null) return;
        const position = this.mapService.getCoordinates(selectedCell);
        if (!position) return;
        const target = this.matchService.findTargetPlayer(position);
        if (!target?.id) return;
        this.socketService.send(MatchEvents.RequestAttack, { targetPlayerId: target.id } as RequestAttackPayload);
    }

    handleCombatTick(seconds: number): void {
        if (!seconds) return;
        this.remainingTime.set(seconds);
    }

    private handleCombatStarted(payload: CombatStartedSocketPayload): void {
        this.resetState();
        const players = this.matchService.players();
        const initiator = players.get(payload.initiatorId);
        const opponent = players.get(payload.oponentId);
        if (!initiator || !opponent) return;

        this.initiator.set(this.toFighter(initiator));
        this.opponent.set(this.toFighter(opponent));
        this.lastRoundResult.set(null);
        this.combatResult.set(null);
        this.isInCombat.set(true);
        this.logService.sendStartFight(opponent.name, payload.initiatorId, payload.oponentId);
    }

    private handleRoundEnded(payload: RoundEndedPayload): void {
        this.lastRoundResult.set(payload.roundResult);
        this.updateFighterHp(payload.playersUpdate);
        this.roundNumber.update(n => n + 1);
        this.selectedPosture.set(null);

        if (payload.isCombatOver) {
            this.isInCombat.set(false);
            const { winnerName, loserName } = this.getWinnerLoserName(payload.winnerId || '', payload.loserId || '');
            this.logService.sendEndFight(winnerName, loserName, payload.winnerId || '', payload.loserId || '');
            if (payload.winnerId) {
                this.matchService.incrementPlayerWins(payload.winnerId);
            }
            if (this.isLocalPlayerInCombat()) {
                this.showCombatResult(payload.winnerId);
            }
            if (payload.loserId) this.endTurnIfActiveLoser(payload.loserId);
        }
    }

    private endTurnIfActiveLoser(loserId: string) {
        if (this.matchService.isMyTurn() && loserId === this.matchService.currentPlayerId) {
            this.matchService.endTurn();
        }
    }
    private getWinnerLoserName(winnerId: string, loserId: string): CombatParticipantNames {
        const players = this.matchService.players();
        return {
            winnerName: winnerId ? (players.get(winnerId)?.name ?? '') : '',
            loserName: loserId ? (players.get(loserId)?.name ?? '') : '',
        };
    }
    private showCombatResult(winnerId: string | null): void {
        const localId = this.matchService.currentPlayerId;
        let message: string;

        if (!winnerId) {
            message = 'Match nul — aucun vainqueur.';
        } else if (winnerId === localId) {
            message = 'Vous avez remporté le combat ! ⚔️';
        } else {
            message = 'Vous avez été vaincu. Courage ! 💀';
        }

        this.combatResult.set({ isWin: winnerId === localId, message });
        setTimeout(() => {
            if (this.combatResult()) this.dismissResult();
        }, COMBAT_RESULT_DISMISS_MS);
    }

    private updateFighterHp(_playersUpdate: Record<string, EndCombatUpdates>): void {
        const result = this.lastRoundResult();
        if (!result) return;

        const initiatorId = this.initiator()?.id;
        const opponentId = this.opponent()?.id;

        if (initiatorId && result.results[initiatorId] !== undefined) {
            this.initiator.update(f => f ? { ...f, hp: result.results[initiatorId].life } : f);
        }
        if (opponentId && result.results[opponentId] !== undefined) {
            this.opponent.update(f => f ? { ...f, hp: result.results[opponentId].life } : f);
        }
    }

    private isPlayerOnIce(playerId: string | undefined): boolean {
        if (!playerId) return false;
        const position = this.matchService.players().get(playerId)?.position;
        if (!position) return false;
        return this.mapService.grid?.[position.y]?.[position.x]?.tile.tileType === TileType.ICE;
    }

    private resetState(): void {
        this.roundNumber.set(1);
        this.selectedPosture.set(null);
        this.remainingTime.set(0);
    }

    private toFighter(player: Player): CombatFighter {
        return {
            id: player.id || '',
            name: player.name,
            avatar: player.avatar || '',
            hp: player.attributes.currentLife,
            maxHp: player.attributes.totalLife,
        };
    }
}