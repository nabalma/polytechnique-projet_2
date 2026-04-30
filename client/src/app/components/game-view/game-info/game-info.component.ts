import { Component, input } from '@angular/core';

@Component({
    selector: 'app-game-info-panel',
    standalone: true,
    imports: [],
    templateUrl: './game-info.component.html',
    styleUrl: './game-info.component.scss',
})
export class GameInfoPanelComponent {
    gridSize = input<number>(0);
    playerCount = input<number>(0);
    maxPlayers = input<number>(0);
    activePlayerName = input<string>('');
}
