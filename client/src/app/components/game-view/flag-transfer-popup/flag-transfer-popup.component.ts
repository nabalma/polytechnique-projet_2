import { Component, inject, input, output } from '@angular/core';
import { MatchService } from '@app/services/match/match.service';
import { FlagTransferRequestPayload } from '@common/interfaces/game-play/flag/flag.interface';

@Component({
    selector: 'app-flag-transfer-popup',
    standalone: true,
    imports: [],
    templateUrl: './flag-transfer-popup.component.html',
    styleUrl: './flag-transfer-popup.component.scss',
})
export class FlagTransferPopupComponent {
    readonly request = input.required<FlagTransferRequestPayload>();
    readonly accepted = output<void>();
    readonly refused = output<void>();

    private readonly matchService = inject(MatchService);

    get requesterHasFlag(): boolean {
        return this.matchService.players().get(this.request().requesterId)?.hasFlag ?? false;
    }

    get transferMessage(): string {
        const name = this.request().requesterName;
        if (this.requesterHasFlag) {
            return `${name} veut vous donner le drapeau.`;
        }
        return `${name} vous demande de lui donner le drapeau.`;
    }

    onAccept(): void {
        this.accepted.emit();
    }

    onRefuse(): void {
        this.refused.emit();
    }
}
