import { Component, input } from '@angular/core';

@Component({
    selector: 'app-page-indicator',
    standalone: true,
    imports: [],
    templateUrl: './page-indicator.component.html',
    styleUrl: './page-indicator.component.scss',
})
export class PageIndicatorComponent {
    readonly currentPage = input<number>(1);
    readonly totalPages = input<number>(1);
}
