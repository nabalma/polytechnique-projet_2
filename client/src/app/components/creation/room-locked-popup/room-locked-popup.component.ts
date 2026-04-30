import { Component, output } from '@angular/core';

@Component({
    selector: 'app-room-locked-popup',
    standalone: true,
    imports: [],
    templateUrl: './room-locked-popup.component.html',
    styleUrl: './room-locked-popup.component.scss',
})
export class RoomLockedPopupComponent {
    readonly retry = output<void>();
    readonly leave = output<void>();

    onRetry(): void {
        this.retry.emit();
    }

    onLeave(): void {
        this.leave.emit();
    }
}
