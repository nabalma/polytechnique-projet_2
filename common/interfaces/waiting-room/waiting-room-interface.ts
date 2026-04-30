import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { GameMap } from '../game-frontend/game-interface';
import { MiniPlayerInfo, Player } from '../player/player-interface';
import { BotProfile } from '../types';


export interface RoomPayload {
    players: Player[];
    isLocked: boolean;
    maxPlayers: number;
    organizerId: string;
    gameMode?: GameMode;
    gameName?: string;
}

export interface WaitingRoom {
    roomId: string;
    gameId: string;
    players: Player[];
    maxPlayers: number;
    isLocked: boolean;
    organizerId: string;
}

export interface RoomState {
    roomId: string;
    gameId: string;
    gameName?: string;
    gameMap: GameMap;
    gameMode: GameMode;
    players: Player[];
    isLocked: boolean;
    isGameStarted: boolean;
    maxPlayers: number;
    organizerId: string;
    socketToPlayerId: Map<string, string>;
}
export interface WaitingRoomNavState {
    player?: Player;
    gameId?: string;
    roomId?: string;
}

export interface CreateRoomPayload {
    player: MiniPlayerInfo;
    gameId: string;
}

export interface RoomUpdatedPayload {
    players: Player[];
    isLocked: boolean;
    maxPlayers: number;
    organizerId: string;
    gameMode: GameMode;
    gameName?: string;
}

export interface JoinRoomPayload {
    player: MiniPlayerInfo;
    roomId: string;
}

export interface JoinRoomSuccessPayload {
    playerId: string;
}

export interface KickPlayerPayload {
    roomId: string;
    targetPlayerId: string;
}

export interface RoomCreatedPayload {
    roomId: string;
    playerId: string;
}

export interface YouWereKickedPayload {
    message: string;
}

export interface OrganizerLeftPayload {
    message: string;
}

export interface GameStartedPayload {
    gameId: string;
    players?: Player[];
}

export interface AddVirtualPlayerPayload {
    roomId: string;
    profile: BotProfile;
}

export interface RemoveVirtualPlayerPayload {
    roomId: string;
    targetPlayerId: string;
}



export interface RoomPlayerPreview {
    name: string;
    avatar: string;
}

export interface AvailableRoomInfo {
    roomId: string;
    gameId: string;
    gameName: string;
    currentPlayers: number;
    maxPlayers: number;
    takenAvatars: string[];
    roomPlayers: RoomPlayerPreview[];
    gameMap: GameMap;
}

export interface AvailableRoomsPayload {
    rooms: AvailableRoomInfo[];
}