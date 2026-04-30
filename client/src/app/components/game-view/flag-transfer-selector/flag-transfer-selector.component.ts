import { Component, input, output } from '@angular/core';
import { Player } from '@common/interfaces/player/player-interface';

@Component({
    selector: 'app-flag-transfer-selector',
    standalone: true,
    imports: [],
    templateUrl: './flag-transfer-selector.component.html',
    styleUrl: './flag-transfer-selector.component.scss',
})
export class FlagTransferSelectorComponent {
    readonly eligibleTargets = input.required<Player[]>();
    readonly currentPlayerHasFlag = input<boolean>(false);

    readonly targetSelected = output<string>();
    readonly cancelled = output<void>();
}
