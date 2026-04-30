import { VirtualPlayerAction } from '@app/model/virtual-player/action/virtual-player-action';
import { VirtualPlayerContext } from '@app/services/match/virtual-player/context/virtual-player-context';
import { getRandomInt } from '@app/services/match/virtual-player/utils/virtual-player.util';
import { VirtualPlayerBehavior } from '@app/services/match/virtual-player/virtual-player-behavior';
import { Posture } from '@common/enum/match/match.enum';
import { VirtualPlayerActionType } from '@common/enum/match/virtual-player.enum';
export class AggressiveVirtualPlayerBehavior extends VirtualPlayerBehavior {

    chooseAction(context: VirtualPlayerContext): VirtualPlayerAction {
        return this.trySanctuary(context)
            ?? this.tryToggleDoor(context)
            ?? this.tryAttack(context)
            ?? this.tryMoveToEnemy(context)
            ?? { type: VirtualPlayerActionType.EndTurn };
    }

    choosePosture(): Posture {
        return Posture.Offensive;
    }

    protected tryAttack(context: VirtualPlayerContext): VirtualPlayerAction | null {
        const enemies = context.getAdjacentEnemies();
        if (enemies.length === 0) return null;
        if (context.isInCombat()) return { type: VirtualPlayerActionType.Posture, posture: Posture.Offensive };
        return { type: VirtualPlayerActionType.Attack, target: enemies[getRandomInt(0, enemies.length - 1)].id };
    }

    protected trySanctuary(context: VirtualPlayerContext): VirtualPlayerAction | null {
        const sanctuaries = context.getAdjacentSanctuaries();
        const sanctuary = sanctuaries[getRandomInt(0, sanctuaries.length - 1)];
        return sanctuary ? { type: VirtualPlayerActionType.Sanctuary, target: sanctuary.position } : null;
    }

    protected tryToggleDoor(context: VirtualPlayerContext): VirtualPlayerAction | null {
        const doors = context.getAdjacentClosedDoors();
        if (doors.length === 0) return null;
        return { type: VirtualPlayerActionType.ToggleDoor, target: doors[getRandomInt(0, doors.length - 1)] };
    }

    private tryMoveToEnemy(context: VirtualPlayerContext): VirtualPlayerAction | null {
        const enemy = context.getNearestEnemy();
        if (!enemy) return null;
        const position = context.getNextStepToward(enemy.position);
        return position ? { type: VirtualPlayerActionType.Move, target: position } : null;
    }
}
