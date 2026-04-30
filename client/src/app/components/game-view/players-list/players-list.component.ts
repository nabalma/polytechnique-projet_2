import { Component, inject, input } from '@angular/core';
import { MatchService } from '@app/services/match/match.service';
import { Player } from '@common/interfaces/player/player-interface';

@Component({
    selector: 'app-match-players-list',
    standalone: true,
    imports: [],
    templateUrl: './players-list.component.html',
    styleUrl: './players-list.component.scss',
})
export class MatchPlayerListComponent {
    readonly players = input<Player[]>([]);
    readonly organizerId = input<string>('');
    readonly currentPlayerId = input<string>('');
    private matchService = inject(MatchService);

    isActive(id: string | undefined) {
        if (!id) return false;
        return this.matchService.activePlayerId === id;
    }
}
