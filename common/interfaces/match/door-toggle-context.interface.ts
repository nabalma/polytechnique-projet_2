import { Player } from '@common/interfaces/player/player-interface';

export interface DoorToggleContext {
    playerId: string;
    activePlayer: Player;
}
