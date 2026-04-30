import { Component, computed, input, OnChanges, Signal, signal, WritableSignal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdministrationService } from '@app/services/administration/administration.service';

@Component({
    selector: 'app-status-game',
    imports: [MatTooltipModule],
    templateUrl: './status-game.component.html',
    styleUrl: './status-game.component.scss',
})
export class StatusGameComponent implements OnChanges {
    readonly isVisible = input<boolean>(true);
    readonly gameId = input<string>('');

    stateVisible: WritableSignal<boolean> = signal(true);
    stateText: Signal<string> = computed(() => (this.stateVisible() ? 'Visible' : 'Caché'));

    constructor(private readonly administrationService: AdministrationService) {}

    ngOnChanges(): void {
        this.stateVisible.set(this.isVisible());
    }

    setVisibility(): void {
        const newVisibility = !this.stateVisible();
        this.stateVisible.set(newVisibility);

        if (this.gameId) {
            this.administrationService.updateGameVisibility(this.gameId(), newVisibility);
        }
    }
}
