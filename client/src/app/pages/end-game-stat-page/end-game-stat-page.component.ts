import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BackButtonComponent } from '@app/components/common-component/back-button/back-button.component';
import { BackgroundImageComponent } from '@app/components/common-component/background-image/background-image.component';
import { GlobalStatsComponent } from '@app/components/game-end/global-stats/global-stats.component';
import { PlayerStatsTableComponent } from '@app/components/game-end/player-stats-table/player-stats-table.component';
import { MessageZoneComponent } from '@app/components/game-view/message-zone/message-zone.component';
import { ChatStateService } from '@app/services/chat/chat-state.service';
import { EndGameStateService } from '@app/services/game-end/end-game-state.service';
import { PlayerEndStats } from '@common/interfaces/game-end/player-end-stats.interface';

@Component({
    selector: 'app-end-game-stat-page',
    standalone: true,
    imports: [BackButtonComponent, BackgroundImageComponent, GlobalStatsComponent, PlayerStatsTableComponent, MessageZoneComponent],
    templateUrl: './end-game-stat-page.component.html',
    styleUrl: './end-game-stat-page.component.scss',
})
export class EndGameStatPageComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly chatState = inject(ChatStateService);
    readonly endGameState = inject(EndGameStateService);

    ngOnInit(): void {
        if (!this.endGameState.stats()) {
            this.router.navigate(['/home']);
        }
    }

    ngOnDestroy(): void {
        this.endGameState.clear();
        this.chatState.reset();
    }

    get currentPlayerIsAbandoned(): boolean {
        const playerName = this.endGameState.playerName();
        return this.endGameState.stats()?.playerStats.find((player) => player.playerName === playerName)?.isAbandoned ?? false;
    }

    winnerTeamStats(): PlayerEndStats[] {
        const teamNames = this.endGameState.winnerTeamPlayers();
        if (teamNames.length > 0) {
            return this.endGameState.stats()?.playerStats.filter((player) => teamNames.includes(player.playerName)) ?? [];
        }
        const soloWinner = this.endGameState.stats()?.playerStats.find((player) => player.playerId === this.endGameState.winnerId());
        return soloWinner ? [soloWinner] : [];
    }
}
