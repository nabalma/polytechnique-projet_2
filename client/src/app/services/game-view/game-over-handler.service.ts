import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { EndGameStateService } from '@app/services/game-end/end-game-state.service';
import { GAME_CANCELLED_NOTIFICATION } from '@common/constants/game-view/game-over.constants';
import { GameOverPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { InitialViewNavState } from '@common/interfaces/navigation/navigation-state-interfaces';
import { Player } from '@common/interfaces/player/player-interface';

@Injectable({ providedIn: 'root' })
export class GameOverHandlerService {
    private readonly router = inject(Router);
    private readonly endGameStateService = inject(EndGameStateService);

    handle(data: GameOverPayload, gameId: string, playerName: string, players: Map<string, Player>): void {
        if (data.cancelled) {
            this.router.navigate(['/home'], { state: { notification: GAME_CANCELLED_NOTIFICATION } as InitialViewNavState });
            return;
        }
        this.endGameStateService.setEndGame({
            winnerId: data.winnerId,
            winnerName: data.winnerName,
            winnerTeam: data.winnerTeam,
            winnerTeamPlayers: this.getWinnerTeamPlayers(data.winnerTeam, players),
            gameId,
            playerName,
            stats: data.stats,
            logEntries: [],
        });
    }

    onClosed(data: GameOverPayload | null): void {
        if (data?.cancelled) {
            this.router.navigate(['/home']);
        } else {
            this.router.navigate(['/end-game']);
        }
    }

    private getWinnerTeamPlayers(winnerTeam: string | undefined, players: Map<string, Player>): string[] {
        if (!winnerTeam) return [];
        return Array.from(players.values())
            .filter((player) => player.team as string === winnerTeam)
            .map((player) => player.name);
    }
}
