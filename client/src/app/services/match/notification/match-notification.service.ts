import { computed, effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { TimerService } from '@app/services/timer/timer.service';
import {
    ABANDON_NOTIFICATION_DISPLAY_MS,
    MOVE_ERROR_DISPLAY_MS,
} from '@common/constants/game-view/game-view.constants';
import { ActiveCountdown } from '@common/enum/match/match.enum';

type TimeoutRef = ReturnType<typeof setTimeout>;
export type GameOverResult = { isWin: boolean; message: string } | null;

@Injectable({ providedIn: 'root' })
export class GameNotificationService implements OnDestroy {
    private readonly timerService = inject(TimerService);

    private _hasSeenPositiveTick = signal<boolean>(false);

    readonly transitionMessage = signal<string>('');
    readonly transitionSeconds = signal<number>(0);
    readonly transitionPlayerName = signal<string>('');
    readonly combatMessage = signal<string>('');
    readonly gameStartMessage = signal<string>('');
    readonly moveErrorMessage = signal<string>('');
    readonly showAbandonMessage = signal<string>('');
    readonly gameOverMessage = signal<string>('');
    readonly gameOverResult = signal<GameOverResult>(null);
    readonly isGameOver = computed(() => this.gameOverResult() !== null);
    readonly isGameWon = computed(() => this.gameOverResult()?.isWin ?? false);

    private readonly activeCountdown = signal<ActiveCountdown | null>(null);
    private readonly countdownLabel = signal<string>('');
    private moveErrorTimeout: TimeoutRef | null = null;

    isGameOverWin: boolean = false;
    private abandonTimeout: ReturnType<typeof setTimeout> | null = null;

    startTurnTransition(playerName: string): void {
        this.transitionPlayerName.set(playerName);
        this.transitionSeconds.set(0);
    }

    updateTransitionCountdown(remaining: number, playerName: string): void {
        this.transitionSeconds.set(remaining);
        this.transitionPlayerName.set(playerName);
    }

    clearTurnTransition(): void {
        this.transitionMessage.set('');
        this.transitionSeconds.set(0);
        this.transitionPlayerName.set('');
    }

    updateEndOfTurnWarning(remaining: number): void {
        this.transitionMessage.set(`Fin du tour dans ${remaining}...`);
    }

    clearEndOfTurnWarning(): void {
        this.transitionMessage.set('');
    }

    constructor() {
        effect(() => {
            const time = this.timerService.remainingTimeSignal();
            const type = this.activeCountdown();
            const label = this.countdownLabel();

            if (!type) return;

            if (time > 0) {

                this._hasSeenPositiveTick.set(true);

                switch (type) {
                    case ActiveCountdown.Transition: this.transitionMessage.set(`${label} dans ${time}...`); break;
                    case ActiveCountdown.Combat: this.combatMessage.set(`⚔️ Combat : ${label} — ${time}...`); break;
                    case ActiveCountdown.GameStart: this.gameStartMessage.set(`${time}`); break;
                }
            } else if (this._hasSeenPositiveTick()) {
                this.clearActiveCountdown();
            }

        });
    }

    stopTransitionCountdown(): void {
        if (this.activeCountdown() === ActiveCountdown.GameStart) this.clearActiveCountdown();
    }

    stopCombatCountdown(): void {
        if (this.activeCountdown() === ActiveCountdown.Combat) this.clearActiveCountdown();
    }

    startTransitionCountdown(nextPlayerName: string): void {
        this._hasSeenPositiveTick.set(false);
        this.countdownLabel.set(nextPlayerName ? `Tour de ${nextPlayerName}` : 'Prochain tour');
        this.activeCountdown.set(ActiveCountdown.Transition);
    }

    startCombatCountdown(attackerName: string, defenderName: string): void {
        this._hasSeenPositiveTick.set(false);
        this.countdownLabel.set(`${attackerName} vs ${defenderName}`);
        this.activeCountdown.set(ActiveCountdown.Combat);
    }

    startGameCountdown(): void {
        this._hasSeenPositiveTick.set(false);
        this.countdownLabel.set('');
        this.activeCountdown.set(ActiveCountdown.GameStart);
    }

    stopGameCountdown(): void {
        if (this.activeCountdown() === ActiveCountdown.GameStart) this.clearActiveCountdown();
    }

    showAbandonNotification(message: string): void {
        if (this.abandonTimeout) clearTimeout(this.abandonTimeout);
        this.showAbandonMessage.set(message);
        this.abandonTimeout = setTimeout(() => {
            this.showAbandonMessage.set('');
            this.abandonTimeout = null;
        }, ABANDON_NOTIFICATION_DISPLAY_MS);
    }

    showMoveError(message: string): void {
        if (this.moveErrorTimeout) clearTimeout(this.moveErrorTimeout);
        this.moveErrorMessage.set(message);
        this.moveErrorTimeout = setTimeout(() => {
            this.moveErrorMessage.set('');
            this.moveErrorTimeout = null;
        }, MOVE_ERROR_DISPLAY_MS);
    }

updateGameStartCountdown(remaining: number): void {
        this.gameStartMessage.set(remaining > 0 ? `${remaining}` : '');
    }

    clearGameStartCountdown(): void {
        this.gameStartMessage.set('');
    }

    showGameOver(isWinner: boolean): void {
        if (isWinner) {
            this.isGameOverWin = true;
            this.gameOverMessage.set('Félicitations, vous avez gagné ! 🏆');
        } else {
            this.isGameOverWin = false;
            this.gameOverMessage.set('Vous avez perdu. Bonne chance la prochaine fois ! 😢');
        }

        this.gameOverResult.set({
            isWin: isWinner,
            message: isWinner
                ? 'Félicitations, vous avez gagné ! 🏆'
                : 'Vous avez perdu. Bonne chance la prochaine fois ! 😢',
        });
    }


    ngOnDestroy(): void {
        this.clearActiveCountdown();
        this.stopCombatCountdown();
        this.clearGameStartCountdown();
        this.clearEndOfTurnWarning();
        if (this.moveErrorTimeout) clearTimeout(this.moveErrorTimeout);
        if (this.abandonTimeout) clearTimeout(this.abandonTimeout);

    }

    resetGameOver(): void {
        this.gameOverResult.set(null);
    }


    private clearActiveCountdown(): void {
        const type = this.activeCountdown();
        this._hasSeenPositiveTick.set(false);
        this.activeCountdown.set(null);
        this.countdownLabel.set('');

        switch (type) {
            case ActiveCountdown.Transition: this.transitionMessage.set(''); break;
            case ActiveCountdown.Combat: this.combatMessage.set(''); break;
            case ActiveCountdown.GameStart: this.gameStartMessage.set(''); break;
        }
    }
}