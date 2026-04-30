import { Component, input, output } from '@angular/core';

@Component({
    selector: 'app-notification-popup',
    imports: [],
    templateUrl: './notification-popup.component.html',
    styleUrl: './notification-popup.component.scss',
})
export class NotificationPopupComponent {
    readonly message = input<string>('');
    readonly closed = output<void>();

    onClose(): void {
        this.closed.emit();
    }
}
