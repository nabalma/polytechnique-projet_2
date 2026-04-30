import { Player } from '../player/player-interface';
import { CellInterface } from './game-grid-interface';

export interface GameState {
    gameId: string;
    roomId: string;
    organizerId: string;
    isDebugMode: boolean;
    players: Player[];
    grid: CellInterface[][];
    gridSize: number;
    turnOrder: string[];
    activePlayerIndex: number;
    turnNumber: number;
    socketToPlayerId: Map<string, string>;
}
