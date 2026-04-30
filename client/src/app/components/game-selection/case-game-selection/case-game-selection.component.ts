import { Component, input, output } from '@angular/core';
import { GameDescriptionComponent } from '@app/components/administration/case-game-administration/game-description/game-description.component';
import { GameImageComponent } from '@app/components/administration/case-game-administration/game-image/game-image.component';
import { GameInterfaceGameSelection } from '@common/interfaces/game-frontend/game-interface-game-selection';
@Component({
    selector: 'app-case-game-selection',
    imports: [GameImageComponent, GameDescriptionComponent],
    templateUrl: './case-game-selection.component.html',
    styleUrl: './case-game-selection.component.scss',
})
export class CaseGameSelectionComponent {
    readonly gameInformation = input.required<GameInterfaceGameSelection>();

    readonly selectGame = output<string>();

    onCardClick(): void {
        this.selectGame.emit(this.gameInformation()._id);
    }
}
