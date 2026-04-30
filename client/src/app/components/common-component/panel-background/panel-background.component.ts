import { Component, HostBinding, computed, input } from '@angular/core';

@Component({
    selector: 'app-panel-background',
    standalone: true,
    template: '<ng-content />',
    styleUrl: './panel-background.component.scss',
})
export class PanelBackgroundComponent {
    readonly src = input.required<string>();
    readonly backgroundSize = input<string>('cover');

    private readonly imageStyle = computed(() => `url('${this.src()}')`);

    @HostBinding('style.backgroundImage')
    get hostBackgroundImage(): string {
        return this.imageStyle();
    }

    @HostBinding('style.backgroundSize')
    get hostBackgroundSize(): string {
        return this.backgroundSize();
    }

    @HostBinding('style.backgroundPosition')
    readonly hostBackgroundPosition = 'center';

    @HostBinding('style.backgroundRepeat')
    readonly hostBackgroundRepeat = 'no-repeat';
}
