import { Component, input } from '@angular/core';

@Component({
    selector: 'app-background-image',
    standalone: true,
    templateUrl: './background-image.component.html',
    styleUrl: './background-image.component.scss',
})
export class BackgroundImageComponent {
    readonly src = input.required<string>();
    readonly alt = input<string>('Background');
}
