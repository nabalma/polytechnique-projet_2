import { Component, input, output } from '@angular/core';
import { SaveStatus } from '@common/enum/save-status/save-status';

@Component({
    selector: 'app-save-status-popup',
    standalone: true,
    imports: [],
    templateUrl: './save-status-popup.component.html',
    styleUrl: './save-status-popup.component.scss',
})
export class SaveStatusPopupComponent {
    readonly saveStatus = SaveStatus;
    readonly status = input<SaveStatus>(SaveStatus.Loading);
    readonly errors = input<string[]>([]);
    readonly close = output<void>();
    readonly confirmQuit = output<void>();

    onClose(): void {
        this.close.emit();
    }

    onConfirmQuit(): void {
        this.confirmQuit.emit();
    }
}
