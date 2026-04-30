import { NgClass } from '@angular/common';
import { Component, input, model } from '@angular/core';
import type { Character } from '@common/interfaces/player/player-interface';

@Component({
    selector: 'app-character-selector',
    standalone: true,
    imports: [NgClass],
    templateUrl: './character-selector.component.html',
    styleUrl: './character-selector.component.scss',
})
export class CharacterSelectorComponent {
    readonly characters = input<Character[]>([]);
    readonly selectedId = model<string | null>(null);
    readonly takenAvatars = input<string[]>([]);

    isTaken(character: Character): boolean {
        return this.takenAvatars().includes(character.previewSrc);
    }

    select(character: Character) {
        if (this.isTaken(character)) return;
        this.selectedId.set(character.id);
    }

    trackById(_: number, character: Character) {
        return character.id;
    }
}
