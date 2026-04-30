import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-navigation-page',
    imports: [RouterLink],
    templateUrl: './navigation-page.component.html',
    styleUrl: './navigation-page.component.scss',
})
export class NavigationPageComponent {
    isMenuOpen = false;

    toggleMenu(): void {
        this.isMenuOpen = !this.isMenuOpen;
    }

    openMenu(): void {
        this.isMenuOpen = true;
    }

    closeMenu(): void {
        this.isMenuOpen = false;
    }
}
