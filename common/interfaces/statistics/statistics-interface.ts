import { Player } from "../player/player-interface";

export interface StatsContext {
    isCTFMode: boolean;
    players: Player[];
    terrainCellCount: number;
    doorCount: number;
    sanctuaryCount: number;
    gameStartTime: number;
    turnNumber: number;
}