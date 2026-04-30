import { Component, input } from '@angular/core';
import { GameEndStatsPayload } from '@common/interfaces/game-end/game-end-stats-payload.interface';

@Component({
    selector: 'app-global-stats',
    standalone: true,
    templateUrl: './global-stats.component.html',
    styleUrl: './global-stats.component.scss',
})
export class GlobalStatsComponent {
    readonly stats = input<GameEndStatsPayload | null>(null);

    formatDuration(ms: number): string {
        const oneSecondInMilli = 1000;
        const oneMinuteInSeconds = 60;
        const totalSeconds = Math.floor(ms / oneSecondInMilli);
        const minutes = Math.floor(totalSeconds / oneMinuteInSeconds).toString().padStart(2, '0');
        const seconds = (totalSeconds % oneMinuteInSeconds).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    formatPercent(value: number): string {
        return `${Math.round(value)}%`;
    }
}
