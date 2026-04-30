import { GameMode } from "@common/enum/game/mode/game-mode.enum";
import { Posture } from '@common/enum/match/match.enum';
import { GameMap } from "../game-frontend/game-interface";
import { Player } from "../player/player-interface";
export interface Position {
    x: number,
    y: number
}
export interface MoveResult {
    to?: number,
    playerId: string,
    approved: boolean,
}
export interface MoveRequest {
    from?: number,
    to: number,
    matchId: string
    y: number,
}

export interface CreateMatchParams {
    roomId: string,
    gameId: string,
    players: Player[],
    gameMap?: GameMap,
    socketToPlayerId?: Map<string, string>,
    organizerId: string,
    gameMode?: GameMode,
}




export interface CombatFighter {
    id: string;
    name: string;
    avatar: string;
    hp: number;
    maxHp: number;
}

export interface RoundEssentialValues {
    life: number;
    dieValue: number;
    chosenPosture: Posture | null;
    totalDamage: number;
    icePenalty: number;
    total: number;
}

export interface RoundValuesPayload {
    results: Record<string, RoundEssentialValues>,
}

export interface CombatResult {
    isWin: boolean;
    message: string;
}



export interface CombatPlayerState {
    posture: Posture | null,
    isAttacker: boolean,
}
