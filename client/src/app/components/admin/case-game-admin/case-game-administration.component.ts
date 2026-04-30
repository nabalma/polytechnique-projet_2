import { Component, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { GameInterfaceAdministration } from '@common/interfaces/game-frontend/game-interface-administration';
import { GameDescriptionComponent } from './game-description/game-description.component';
import { GameImageComponent } from './game-image/game-image.component';
import { StatusGameComponent } from './status-game/status-game.component';
import { TextualInformationComponent } from './textual-information/textual-information.component';
@Component({
    selector: 'app-case-game-administration',
    imports: [GameImageComponent, TextualInformationComponent, StatusGameComponent, GameDescriptionComponent],
    templateUrl: './case-game-administration.component.html',
    styleUrl: './case-game-administration.component.scss',
})
export class CaseGameAdministrationComponent {
    readonly gameInformation = input.required<GameInterfaceAdministration>();
    readonly deleteRequestGame = output<string>();

    constructor(private route: Router) {}


    onDeleteClick(event?: Event): void {
        if (event) event.stopPropagation();
        if (this.gameInformation()._id) {
            this.deleteRequestGame.emit(this.gameInformation()._id);
        }
    }

    onEditClick(): void {
        const routeNavigation = `/edition/${this.gameInformation()._id}`;
        this.route.navigate([routeNavigation]);
    }
}
