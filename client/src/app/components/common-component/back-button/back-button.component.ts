import { Location } from '@angular/common';
import { Component, HostBinding, input } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationStateService } from '@app/services/navigation/navigation-state.service';
import { HOME_ROUTE } from '@common/constants/game/game-info.constants';

@Component({
    selector: 'app-back-button',
    standalone: true,
    imports: [],
    templateUrl: './back-button.component.html',
    styleUrl: './back-button.component.scss',
})
export class BackButtonComponent {
    readonly topLeft = input(false);
    readonly topNav = input(false);
    readonly homeOnly = input(false);

    @HostBinding('class.top-left')
    get hasTopLeft(): boolean {
        return this.topLeft();
    }

    @HostBinding('class.top-nav')
    get hasTopNav(): boolean {
        return this.topNav();
    }

    constructor(
        private readonly location: Location,
        private readonly router: Router,
        private readonly navigationState: NavigationStateService,
    ) {}

    get isAtHome(): boolean {
        if (this.homeOnly()) return true;
        const previous = this.navigationState.getPreviousUrl();
        return previous === null || previous === HOME_ROUTE;
    }

    get label(): string {
        return this.isAtHome ? 'Accueil' : 'Retour';
    }

    navigate(): void {
        if (this.isAtHome) {
            this.router.navigate([HOME_ROUTE]);
        } else {
            this.location.back();
        }
    }
}
