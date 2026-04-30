import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GameRulesPanelComponent } from '@app/components/common-component/game-rules-panel/game-rules-panel.component';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';

@Component({
    selector: 'app-game-rules-modal',
    standalone: true,
    imports: [GameRulesPanelComponent],
    templateUrl: './game-rules-modal.component.html',
    styleUrl: './game-rules-modal.component.scss',
})
export class GameRulesModalComponent {
    @Input() gameMode: GameMode = GameMode.CLASSIC;
    @Output() closed = new EventEmitter<void>();
}
