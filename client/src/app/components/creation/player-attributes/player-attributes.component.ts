import { NgClass } from '@angular/common';
import { Component, model } from '@angular/core';
import { ATTRIBUTE_BONUS, PLAYER_DEFAULTS } from '@common/constants/character/player-attribute-default';
import { AssignationDice, BonusAttribute } from '@common/enum/player/player.enum';
import { BasePlayerAttribute } from '@common/interfaces/player/player-interface';
import { DiceType } from '@common/interfaces/types';


@Component({
    selector: 'app-player-attributes',
    standalone: true,
    imports: [NgClass],
    templateUrl: './player-attributes.component.html',
    styleUrl: './player-attributes.component.scss',
})
export class PlayerAttributesComponent {

    bonus = model<BonusAttribute>(BonusAttribute.Life);

    d6AssignedTo = model<AssignationDice>(AssignationDice.Attack);

    readonly assignationDice = AssignationDice;
    readonly bonusAttribute = BonusAttribute;

    setBonus(value: BonusAttribute) {
        this.bonus.set(value);
    }

    setD6(value: AssignationDice) {
        this.d6AssignedTo.set(value);
    }

    value(attribute: BonusAttribute | AssignationDice): number {
        const baseValues: BasePlayerAttribute = {
            life: PLAYER_DEFAULTS.healthBase,
            speed: PLAYER_DEFAULTS.speedBase,
            attack: PLAYER_DEFAULTS.attackBase,
            defense: PLAYER_DEFAULTS.defenseBase,
        };

        return baseValues[attribute] + (attribute === this.bonus() ? ATTRIBUTE_BONUS : 0);
    }

    diceFor(attribute: AssignationDice): DiceType {
        return this.d6AssignedTo() === attribute ? DiceType.D6 : DiceType.D4;
    }
}
