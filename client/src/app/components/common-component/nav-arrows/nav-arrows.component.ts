import { Component, input, output } from '@angular/core';

@Component({
    selector: 'app-nav-arrows',
    imports: [],
    templateUrl: './nav-arrows.component.html',
    styleUrl: './nav-arrows.component.scss',
})
export class NavArrowsComponent {
    readonly canGoPrev = input<boolean>(false);
    readonly canGoNext = input<boolean>(false);

    readonly previous = output<void>();
    readonly next = output<void>();

    onPrev(): void {
        if (this.canGoPrev()) {
            this.previous.emit();
        }
    }

    onNext(): void {
        if (this.canGoNext()) {
            this.next.emit();
        }
    }
}
