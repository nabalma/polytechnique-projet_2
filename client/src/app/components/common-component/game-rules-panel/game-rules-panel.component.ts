import { Component, Input } from '@angular/core';
import { CLASSIC_RULES, CTF_RULES, GameRule } from '@common/constants/game/game-rules.constants';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';

@Component({
    selector: 'app-game-rules-panel',
    standalone: true,
    templateUrl: './game-rules-panel.component.html',
    styleUrl: './game-rules-panel.component.scss',
})
export class GameRulesPanelComponent {
    @Input() gameMode: GameMode = GameMode.CLASSIC;

    get rules(): GameRule[] {
        return this.gameMode === GameMode.CTF ? CTF_RULES : CLASSIC_RULES;
    }

    get modeLabel(): string {
        return this.gameMode === GameMode.CTF ? 'Mode CTF' : 'Mode Classique';
    }
}
