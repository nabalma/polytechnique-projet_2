import { VirtualPlayerAction } from '@app/model/virtual-player/action/virtual-player-action';
import { VirtualPlayerContext } from '@app/services/match/virtual-player/context/virtual-player-context';
import { VirtualPlayerActionType } from '@common/enum/match/virtual-player.enum';

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function tryPickupFlag(context: VirtualPlayerContext): VirtualPlayerAction | null {
    const flagPos = context.getFlagPosition();
    if (!flagPos) return null;
    const step = context.getNextStepToward(flagPos);
    return step ? { type: VirtualPlayerActionType.Move, target: step } : null;
}