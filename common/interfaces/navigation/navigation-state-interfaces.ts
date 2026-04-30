import { Player } from '../player/player-interface';

export interface InitialViewNavState {
    notification?: string;
}

export interface CreationNavState {
    isJoin?: boolean;
    roomId?: string;
    takenAvatars?: string[];
}

export interface WaitingRoomNavState {
    player?: Player;
    gameId?: string;
    roomId?: string;
    playerId?: string;
}
