import { inject, Injectable } from '@angular/core';
import { CombatService } from '@app/services/combat/combat.service';
import { MatchService } from '@app/services/match/match.service';
import { TimerService } from '@app/services/timer/timer.service';
import { SECONDS_PER_MINUTE, TIMER_DISPLAY_PAD_LENGTH, TIMER_LOW_THRESHOLD_SECONDS } from '@common/constants/game-view/game-view.constants';

@Injectable({ providedIn: 'root' })
export class TimerDisplayService {
    private readonly timerService = inject(TimerService);
    private readonly combatService = inject(CombatService);
    private readonly matchService = inject(MatchService);

    readonly label = 'Temps restant';

    get display(): string {
        return this.formatSeconds(Math.max(0, this.timerService.remainingTime));
    }

    get isLow(): boolean {
        if (this.combatService.isInCombat()) return false;
        if (this.matchService.isTransitioning) return false;
        return this.timerService.remainingTime <= TIMER_LOW_THRESHOLD_SECONDS && this.timerService.remainingTime > 0;
    }

    private formatSeconds(totalSeconds: number): string {
        const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE).toString().padStart(TIMER_DISPLAY_PAD_LENGTH, '0');
        const seconds = (totalSeconds % SECONDS_PER_MINUTE).toString().padStart(TIMER_DISPLAY_PAD_LENGTH, '0');
        return `${minutes}:${seconds}`;
    }
}
