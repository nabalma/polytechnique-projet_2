import { Component, inject, input, OnDestroy, OnInit, output } from '@angular/core';
import { MatchService } from '@app/services/match/match.service';
import {
    GAME_OVER_ICONS, GAME_OVER_MESSAGES_CLASSIC, GAME_OVER_MESSAGES_CTF,
    GAME_OVER_REDIRECT_DELAY_SECONDS, GAME_OVER_TITLES, TEAM_LABELS,
} from '@common/constants/game-view/game-over.constants';
import { GameOverPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';

@Component({
    selector: 'app-game-over-popup',
    standalone: true,
    imports: [],
    templateUrl: './game-over-popup.component.html',
    styleUrl: './game-over-popup.component.scss',
})
export class GameOverPopupComponent implements OnInit, OnDestroy {
    readonly gameOver = input.required<GameOverPayload>();
    readonly closed = output<void>();

    countdown = GAME_OVER_REDIRECT_DELAY_SECONDS;

    private countdownInterval: ReturnType<typeof setInterval> | null = null;
    private readonly matchService = inject(MatchService);


    ngOnInit(): void {
        const oneSecondInMilli = 1000;
        this.countdownInterval = setInterval(() => {
            this.countdown--;
            if (this.countdown <= 0) {
                this.onClose();
            }
        }, oneSecondInMilli);
    }

    ngOnDestroy(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }

    get isCancelled(): boolean {
        return this.gameOver().cancelled === true;
    }

    get isCurrentPlayerWinner(): boolean {
        if (this.isCancelled) return false;
        const winnerId = this.gameOver().winnerId;
        const winnerTeam = this.gameOver().winnerTeam;
        const currentPlayer = this.matchService.players().get(this.matchService.currentPlayerId);
        if (!currentPlayer) return false;
        if (winnerTeam && currentPlayer.team) {
            return currentPlayer.team === winnerTeam;
        }
        return currentPlayer.id === winnerId;
    }

    get winnerTeamLabel(): string {
        const team = this.gameOver().winnerTeam;
        if (team) return TEAM_LABELS[team] ?? team;
        return '';
    }

    get title(): string {
        if (this.isCancelled) return GAME_OVER_TITLES.cancelled;
        return this.isCurrentPlayerWinner ? GAME_OVER_TITLES.victory : GAME_OVER_TITLES.defeat;
    }

    get icon(): string {
        if (this.isCancelled) return GAME_OVER_ICONS.cancelled;
        return this.isCurrentPlayerWinner ? GAME_OVER_ICONS.victory : GAME_OVER_ICONS.defeat;
    }

    get victoryMessage(): string {
        const team = this.winnerTeamLabel;
        if (team) return GAME_OVER_MESSAGES_CTF.victory;
        return GAME_OVER_MESSAGES_CLASSIC.victory;
    }

    get defeatMessage(): string {
        const name = this.gameOver().winnerName;
        const team = this.winnerTeamLabel;
        if (team) return GAME_OVER_MESSAGES_CTF.defeat(name, team);
        return GAME_OVER_MESSAGES_CLASSIC.defeat(name);
    }

    onClose(): void {
        this.closed.emit();
    }
}
