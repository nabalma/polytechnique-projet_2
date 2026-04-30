import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-pop-up-confirmation-supp',
  imports: [],
  templateUrl: './pop-up-confirmation-supp.component.html',
  styleUrl: './pop-up-confirmation-supp.component.scss',
})
export class PopUpConfirmationSuppComponent {
  readonly message = input<string>('Êtes-vous sûr ?');
  readonly confirm = output<void>();
  readonly cancel = output<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

}
