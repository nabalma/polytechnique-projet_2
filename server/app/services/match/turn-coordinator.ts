import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { Timer } from '@app/model/match-models/timer/timer';
import { SanctuaryService } from '@app/services/sanctuary/sanctuary.service';
import { LogVirtualPlayerService } from '@app/services/virtual-log/virtual-log.service';
import { BEFORE_GAME, TRANS_DURATION, TURN_DURATION } from '@common/constants/timer/timer-constants';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { SanctuaryReactivatedPayload, TransitionPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Player } from '@common/interfaces/player/player-interface';
import { MatchEvents, TimerEvents } from '@common/socket_event/match/match.gateway.events';

export interface TurnCoordinatorServices {
    broadCast: BroadcastService;
    sanctuaryService: SanctuaryService;
    virtualLogService: LogVirtualPlayerService;
}

export interface TurnCoordinatorCallbacks {
    isGameCancelled: () => boolean;
    hasNoAvailableActions: (player: Player) => boolean;
    onForceEndTurn: () => void;
    onStartVirtualPlayerTurn: (player: Player) => void;
}

export class TurnCoordinator {
    private _transitioning = true;
    private readonly broadCast: BroadcastService;
    private readonly sanctuaryService: SanctuaryService;
    private readonly virtualLogService: LogVirtualPlayerService;

    constructor(
        private readonly gameState: GameState,
        private readonly timer: Timer,
        private readonly sanctuaryReactivationTurns: Map<string, number>,
        services: TurnCoordinatorServices,
        private readonly callbacks: TurnCoordinatorCallbacks,
    ) {
        this.broadCast = services.broadCast;
        this.sanctuaryService = services.sanctuaryService;
        this.virtualLogService = services.virtualLogService;
    }

    get isTransitioning(): boolean {
        return this._transitioning;
    }

    beginMatch(): void {
        this._transitioning = true;
        const payload = this.resetPlayerPayload();
        const activePlayer = this.getActivePlayer();
        if (activePlayer?.isVirtual) this.virtualLogService.sendVirtualStartTurn(activePlayer.roomId, activePlayer.name);
        this.broadCast.emitToRoom(this.gameState.roomId, TimerEvents.StartingMatch, payload);
        this.timer.start(BEFORE_GAME, this.nextTurn);
    }

    handleTransition = (): void => {
        const previousPlayer = this.getActivePlayer();
        if (previousPlayer) this.broadCast.emitReachableCells(previousPlayer.id, []);
        this._transitioning = true;
        const activePlayers = this.getActivePlayers();
        let next = (this.gameState.activePlayerIndex + 1) % this.gameState.turnOrder.length;
        while (activePlayers.length > 0 && !activePlayers.some((player) => player.id === this.gameState.turnOrder[next])) {
            next = (next + 1) % this.gameState.turnOrder.length;
        }
        this.gameState.activePlayerIndex = next;
        const payload = this.resetPlayerPayload();
        const activePlayer = this.getActivePlayer();
        if (activePlayer?.isVirtual) this.virtualLogService.sendVirtualStartTurn(activePlayer.roomId, activePlayer.name);
        this.broadCast.emitToRoom(this.gameState.roomId, TimerEvents.StartTransition, payload);
        this.timer.start(TRANS_DURATION, this.nextTurn);
    };

    advanceToNextPlayer(): void {
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length <= 1) return;
        this.handleTransition();
    }

    private nextTurn = (): void => {
        this.gameState.turnNumber++;
        this._transitioning = false;
        this.applySanctuaryEffects();
        const activePlayer = this.getActivePlayer();
        this.broadCast.emitToRoom(this.gameState.roomId, TimerEvents.NextTurn);
        this.timer.start(TURN_DURATION, this.handleTransition);
        if (activePlayer && !this.callbacks.isGameCancelled() && this.callbacks.hasNoAvailableActions(activePlayer)) {
            this.callbacks.onForceEndTurn();
            return;
        }
        if (activePlayer?.isVirtual) this.callbacks.onStartVirtualPlayerTurn(activePlayer);
    };

    private applySanctuaryEffects(): void {
        const anyReactivated = this.sanctuaryService.reactivateExpiredSanctuaries(
            this.gameState, this.sanctuaryReactivationTurns,
        );
        if (anyReactivated) {
            this.broadCast.emitToRoom(this.gameState.roomId, MatchEvents.SanctuaryReactivated, {
                updatedGrid: this.gameState.grid,
            } as SanctuaryReactivatedPayload);
        }
        const activePlayer = this.getActivePlayer();
        if (activePlayer) this.sanctuaryService.expireCombatBonusIfDue(activePlayer.id, this.gameState);
    }

    private resetPlayerPayload(): TransitionPayload | undefined {
        const player = this.getActivePlayer();
        if (!player) return undefined;
        player.remainingMovement = player.attributes.speed;
        player.isActive = true;
        player.remainingActions = 1;
        return { nextPlayerId: player.id, remainingMovement: player.remainingMovement, remainingActions: player.remainingActions };
    }

    private getActivePlayer(): Player | undefined {
        const activePlayerId = this.gameState.turnOrder[this.gameState.activePlayerIndex];
        return this.gameState.players.find(player => player.id === activePlayerId);
    }

    private getActivePlayers(): Player[] {
        return this.gameState.players.filter((player) => player.remainingActions !== -1);
    }
}
