import { Component, input, output } from '@angular/core';
import { DEFAULT_MAX_PLAYERS } from '@common/constants/waiting-room.constants';

@Component({
    selector: 'app-start-game-button',
    standalone: true,
    templateUrl: './start-game-button.component.html',
    styleUrl: './start-game-button.component.scss',
})
export class StartGameButtonComponent {
    readonly isOrganizer = input<boolean>(false);
    readonly playerCount = input<number>(0);
    readonly startGame = output<void>();

    get canStart(): boolean {
        return this.isOrganizer() && this.playerCount() >= DEFAULT_MAX_PLAYERS;
    }

    get tooltip(): string {
        if (!this.isOrganizer()) return '';
        if (this.playerCount() < DEFAULT_MAX_PLAYERS) return `Nécessite au moins ${DEFAULT_MAX_PLAYERS} joueurs`;
        return '';
    }

    onStart(): void {
        if (this.canStart) this.startGame.emit();
    }
}
