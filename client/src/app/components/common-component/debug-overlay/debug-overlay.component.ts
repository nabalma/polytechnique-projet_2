import { Component, input } from '@angular/core';

@Component({
    selector: 'app-debug-overlay',
    standalone: true,
    imports: [],
    templateUrl: './debug-overlay.component.html',
    styleUrls: ['./debug-overlay.component.scss'],
})
export class DebugOverlayComponent {
    readonly isDebugMode = input<boolean>(false);

}


