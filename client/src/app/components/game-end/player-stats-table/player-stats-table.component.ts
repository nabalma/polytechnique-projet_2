import { Component, input } from '@angular/core';
import { PlayerEndStats } from '@common/interfaces/game-end/player-end-stats.interface';

type SortColumn = keyof Omit<PlayerEndStats, 'playerId' | 'isAbandoned'>;

@Component({
    selector: 'app-player-stats-table',
    standalone: true,
    templateUrl: './player-stats-table.component.html',
    styleUrl: './player-stats-table.component.scss',
})
export class PlayerStatsTableComponent {
    readonly players = input<PlayerEndStats[]>([]);
    readonly winnerId = input<string>('');
    readonly winnerTeamPlayerNames = input<string[]>([]);
    readonly winnerTeam = input<string>('');

    sortColumn: SortColumn = 'victoryCount';
    sortAscending: boolean = false;

    sortBy(column: SortColumn): void {
        if (this.sortColumn === column) {
            this.sortAscending = !this.sortAscending;
        } else {
            this.sortColumn = column;
            this.sortAscending = false;
        }
    }

    getSortedPlayers(): PlayerEndStats[] {
        return [...this.players()].sort((a, b) => {
            const aVal = a[this.sortColumn];
            const bVal = b[this.sortColumn];
            const dir = this.sortAscending ? 1 : -1;
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return aVal.localeCompare(bVal) * dir;
            }
            return ((aVal as number) - (bVal as number)) * dir;
        });
    }

    getSortIcon(column: SortColumn): string {
        if (this.sortColumn !== column) return '⇅';
        return this.sortAscending ? '▲' : '▼';
    }

    formatPercent(value: number): string {
        return `${Math.round(value)}%`;
    }

    isWinner(player: PlayerEndStats): boolean {
        if (this.winnerTeamPlayerNames().length > 0) {
            return this.winnerTeamPlayerNames().includes(player.playerName);
        }
        return player.playerId === this.winnerId();
    }
}
