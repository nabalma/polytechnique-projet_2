import { VirtualPlayerAction } from '@app/model/virtual-player/action/virtual-player-action';
import { VirtualPlayerContext } from '@app/services/match/virtual-player/context/virtual-player-context';

export abstract class VirtualPlayerBehavior {
    abstract chooseAction(context: VirtualPlayerContext): VirtualPlayerAction

}
