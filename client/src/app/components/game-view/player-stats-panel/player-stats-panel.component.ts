import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { MatchService } from '@app/services/match/match.service';

@Component({
    selector: 'app-player-stats-panel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './player-stats-panel.component.html',
    styleUrl: './player-stats-panel.component.scss',
})
export class PlayerStatsPanelComponent {

    constructor(private matchService: MatchService) {}

    player = computed(() => {
        const id = this.matchService.currentPlayerId;
        const player = this.matchService.players().get(id);
        return player ?? null;
    });
}
