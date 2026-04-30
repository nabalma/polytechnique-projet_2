import { Component, effect, inject } from '@angular/core';
import { SanctuaryInteractionService } from '@app/services/match/action/sanctuary-interaction.service';
import { TimerService } from '@app/services/timer/timer.service';
import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { SanctuaryInteractionMode } from '@common/interfaces/game-play/game-play-payloads-interfaces';

@Component({
    selector: 'app-sanctuary-modal',
    standalone: true,
    templateUrl: './sanctuary-modal.component.html',
    styleUrls: ['./sanctuary-modal.component.scss'],
})
export class SanctuaryModalComponent {
    readonly sanctuaryService = inject(SanctuaryInteractionService);
    private readonly timerService = inject(TimerService);

    readonly sanctuaryInteractionMode = SanctuaryInteractionMode;
    readonly objectType = ObjectType;

    constructor() {
        effect(() => {
            const remaining = this.timerService.remainingTimeSignal();
            if (this.sanctuaryService.showModal() && remaining <= 0) {
                this.sanctuaryService.cancel();
            }
        });
    }

    get sanctuaryType(): ObjectType | null {
        return this.sanctuaryService.pendingSanctuaryType();
    }

    get isCombat(): boolean {
        return this.sanctuaryType === ObjectType.COMBAT_SANCTUARY;
    }

    get title(): string {
        return this.isCombat ? 'Sanctuaire de Combat' : 'Sanctuaire de Soin';
    }

    get icon(): string {
        return this.isCombat ? '⚔️' : '💚';
    }

    get description(): string {
        if (this.isCombat) return '+1 attaque et +1 défense jusqu\'à la fin de votre prochain tour.';
        return 'Récupérez 2 points de vie (sans dépasser le maximum).';
    }

    onNormal(): void {
        this.sanctuaryService.confirm(SanctuaryInteractionMode.Normal);
    }

    onDoubleOrNothing(): void {
        this.sanctuaryService.confirm(SanctuaryInteractionMode.DoubleOrNothing);
    }

    onCancel(): void {
        this.sanctuaryService.cancel();
    }
}
