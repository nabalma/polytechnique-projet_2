import { Component, output } from '@angular/core';

@Component({
    selector: 'app-abandon-confirm-popup',
    standalone: true,
    imports: [],
    templateUrl: './abandon-confirm-popup.component.html',
    styleUrl: './abandon-confirm-popup.component.scss',
})
export class AbandonConfirmPopupComponent {
    readonly confirmed = output<void>();
    readonly cancelled = output<void>();

    onConfirm(): void {
        this.confirmed.emit();
    }

    onCancel(): void {
        this.cancelled.emit();
    }
}
