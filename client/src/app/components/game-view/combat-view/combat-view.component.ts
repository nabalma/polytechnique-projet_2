import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CombatService } from '@app/services/combat/combat.service';
import { MatchService } from '@app/services/match/match.service';
import { TimerService } from '@app/services/timer/timer.service';
import { Posture } from '@common/enum/match/match.enum';
@Component({
    selector: 'app-combat-interface',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './combat-view.component.html',
    styleUrls: ['./combat-view.component.scss'],
})
export class CombatViewComponent {
    readonly combatService = inject(CombatService);
    readonly matchService = inject(MatchService);
    readonly timerService = inject(TimerService);
    readonly posture = Posture;
    chooseDefensive() {
        this.combatService.choosePosture(Posture.Defensive);
    }

    chooseOffensive() {
        this.combatService.choosePosture(Posture.Offensive);
    }
    isDefensive(): boolean {
        return this.combatService.selectedPosture() === Posture.Defensive;
    }
    isOffensive(): boolean {
        return this.combatService.selectedPosture() === Posture.Offensive;
    }
}
