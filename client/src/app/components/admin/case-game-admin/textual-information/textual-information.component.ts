import { Component, input } from '@angular/core';

@Component({
    selector: 'app-textual-information',
    imports: [],
    templateUrl: './textual-information.component.html',
    styleUrl: './textual-information.component.scss',
})
export class TextualInformationComponent {
    readonly name = input<string>('');

    readonly size = input<number>(0);

    readonly createdAt = input<Date>();

    readonly updatedAt = input<Date>();

    readonly mode = input<string>('');
}
