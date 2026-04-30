import { inject, Injectable } from '@angular/core';
import { LogService } from '@app/services/logs/logs.service';
import { GameNotificationService } from '@app/services/match/notification/match-notification.service';
import { MatchPlayerService } from '@app/services/match/player/match-player.service';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import { TimerService } from '@app/services/timer/timer.service';
import { GAME_START_COUNTDOWN_START } from '@common/constants/game-view/game-view.constants';
import { TURN_DURATION } from '@common/constants/timer/timer-constants';
import { TransitionPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { MatchEvents } from '@common/socket_event/match/match.gateway.events';

@Injectable({
    providedIn: 'root',
})
export class MatchTurnService {
    transitioning: boolean = false;
    private isBeforeGame: boolean = false;
    private notifications = inject(GameNotificationService);

    constructor(
        private playerService: MatchPlayerService,
        private socketService: MatchSocketService,
        private logService: LogService,
        private timerService: TimerService,
    ) {}

    get isTransitioning(): boolean {
        return this.transitioning;
    }

    isMyTurn(): boolean {
        return this.playerService.activePlayerId === this.playerService.currentPlayerId && !this.transitioning;
    }

    get canEndTurn(): boolean {
        return (this.isMyTurn() && !this.transitioning) || (this.playerService.isDebugMode && this.playerService.isOrganizer);
    }

    get canTakeAction(): boolean {
        return this.isMyTurn() && !this.transitioning && (this.playerService.currentPlayer?.remainingActions ?? 0) > 0;
    }

    handleStartingMatch(payload: TransitionPayload): void {
        if (!payload?.nextPlayerId) return;
        this.isBeforeGame = true;
        this.timerService.remainingTime = TURN_DURATION;
        this.handleTransition(payload);
    }

    handleTransition(payload: TransitionPayload): void {
        this.playerService.setActivePlayerId(payload.nextPlayerId);
        if (!this.isBeforeGame) {
            this.sendStartTurn();
        }
        this.transitioning = true;
        this.requestReachable();
        this.playerService.updateActiveStates(payload.nextPlayerId, payload.remainingMovement, payload.remainingActions);
        this.notifications.startTransitionCountdown(this.playerService.activePlayerName);
    }

    handleNextTurn(): void {
        this.transitioning = false;
        this.notifications.clearTurnTransition();
        this.notifications.clearEndOfTurnWarning();
        if (this.isBeforeGame) {
            this.isBeforeGame = false;
            this.notifications.clearGameStartCountdown();
            this.sendStartTurn();
        }
        this.requestReachable();
    }

    handleTimerTick(remaining: number): void {
        this.timerService.remainingTime = remaining;
        if (this.isBeforeGame) {
            if (this.timerService.remainingTime <= GAME_START_COUNTDOWN_START) {
                this.notifications.updateGameStartCountdown(remaining);
            }
        } else if (this.transitioning) {
            const playerName = this.playerService.players().get(this.playerService.activePlayerId)?.name ?? '';
            this.notifications.updateTransitionCountdown(this.timerService.remainingTime, playerName);
        }
    }

    sendStartTurn(): void {
        if (this.isMyTurn()) this.logService.sendStartTurn();
    }

    requestReachable(): void {
        if (this.playerService.activePlayerId === this.playerService.currentPlayerId) {
            this.socketService.send(MatchEvents.RequestReachables);
        }
    }
}
