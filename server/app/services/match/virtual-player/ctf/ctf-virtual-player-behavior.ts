import { VirtualPlayerAction } from '@app/model/virtual-player/action/virtual-player-action';
import { AggressiveVirtualPlayerBehavior } from '@app/services/match/virtual-player/agressive/aggressive-virtual-player-behavior';
import { VirtualPlayerContext } from '@app/services/match/virtual-player/context/virtual-player-context';
import { DefensiveVirtualPlayerBehavior } from '@app/services/match/virtual-player/defensive/defensive-virtual-player-behavior';
import { tryPickupFlag } from '@app/services/match/virtual-player/utils/virtual-player.util';
import { VirtualPlayerActionType } from '@common/enum/match/virtual-player.enum';

export class CTFAggressiveVirtualPlayerBehavior extends AggressiveVirtualPlayerBehavior {

    chooseAction(context: VirtualPlayerContext): VirtualPlayerAction {
        return super.trySanctuary(context)
            ?? super.tryToggleDoor(context)
            ?? this.tryReturnFlag(context)
            ?? tryPickupFlag(context)
            ?? this.tryChaseFlagHolder(context)
            ?? super.tryAttack(context)
            ?? { type: VirtualPlayerActionType.EndTurn };
    }


    private tryReturnFlag(context: VirtualPlayerContext): VirtualPlayerAction | null {
        if (!context.getPlayer().hasFlag) return null;
        const step = context.getNextStepToward(context.getPlayer().startPosition);
        return step ? { type: VirtualPlayerActionType.Move, target: step } : null;
    }

    private tryChaseFlagHolder(context: VirtualPlayerContext): VirtualPlayerAction | null {
        const holder = context.getFlagHolder();
        if (!holder || context.isSameTeam(holder) || context.isAdjacentEnemy(holder)) return null;
        const step = context.getNextStepToward(holder.position);
        return step ? { type: VirtualPlayerActionType.Move, target: step } : null;
    }
}

export class CTFDefensiveVirtualPlayerBehavior extends DefensiveVirtualPlayerBehavior {

    chooseAction(context: VirtualPlayerContext): VirtualPlayerAction {
        return this.trySanctuary(context)
            ?? this.tryToggleDoor(context)
            ?? this.tryReturnFlag(context)
            ?? tryPickupFlag(context)
            ?? this.tryBlockFlagHolder(context)
            ?? this.tryAttack(context)
            ?? { type: VirtualPlayerActionType.EndTurn };
    }

    private tryReturnFlag(context: VirtualPlayerContext): VirtualPlayerAction | null {
        const player = context.getPlayer();
        if (!player.hasFlag) return null;
        const step = context.getNextStepToward(player.startPosition);
        return step ? { type: VirtualPlayerActionType.Move, target: step } : null;
    }

    private tryBlockFlagHolder(context: VirtualPlayerContext): VirtualPlayerAction | null {
        const holder = context.getFlagHolder();
        if (!holder || context.isSameTeam(holder)) return null;
        const step = context.getNextStepToward(holder.startPosition);
        return step ? { type: VirtualPlayerActionType.Move, target: step } : null;
    }


}