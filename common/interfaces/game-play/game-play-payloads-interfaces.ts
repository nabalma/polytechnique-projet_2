import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { GameEndStatsPayload } from '../game-end/game-end-stats-payload.interface';
import { CellInterface } from '../game-frontend/game-grid-interface';
import { Position, RoundValuesPayload } from '../match/match-interface';
import { Player } from '../player/player-interface';

export interface GameStatePayload {
    players: Player[];
    activePlayerIndex: number;
    grid: CellInterface[][];
    turnNumber: number;
}

export interface TurnStartedPayload {
    activePlayerId: string;
    movementPoints: number;
}

export interface ReachableCellsPayload {
    cells: Position[];
}

export interface PlayerMovedPayload {
    playerId: string;
    newPosition: Position;
    remainingMovement: number;
    path?: Position[];
}

export interface TransitionPayload {
    nextPlayerId: string;
    remainingMovement: number,
    remainingActions: number,
}

export interface CombatResultPayload {
    initiatorId: string;
    opponentId: string;
    attackRoll?: number;
    defenseRoll?: number;
    damageDealt?: number;
    opponentCurrentLife?: number;
    opponentEliminated?: boolean;
}

export interface EndCombatUpdates {
    newPosition: Position | null,
    newLife: number | null,
}

export interface RoundEndedResult {
    isCombatOver: boolean;
    winnerId: string | null;
    loserId: string | null;
    roundResult: RoundValuesPayload;
}
export interface RoundEndedPayload extends RoundEndedResult {
    playersUpdate: Record<string, EndCombatUpdates>;
}

export interface DoorToggledPayload {
    position: Position;
    isOpen: boolean;
    playerId: string;
}

export interface ActionConsumedPayload {
    playerId: string;
    remainingActions: number;
}

export interface PlayerAbandonedPayload {
    playerId: string;
    playerName: string;
    updatedGrid: CellInterface[][];
}

export interface GameOverPayload {
    winnerId: string;
    winnerName: string;
    winnerTeam?: string;
    cancelled?: boolean;
    stats: GameEndStatsPayload;
}

export interface MoveRequestPayload {
    targetPosition: Position;
    from?: number,
    to?: number,
    matchId?: number,
}

export interface RequestAttackPayload {
    targetPlayerId: string;
}

export interface RequestToggleDoorPayload {
    position: Position;
}

export interface RequestTeleportPayload {
    targetPosition: Position;
}

export interface DebugModeToggledPayload {
    isDebugMode: boolean;
}

export enum SanctuaryInteractionMode {
    Normal = 'normal',
    DoubleOrNothing = 'doubleOrNothing',
}

export interface RequestSanctuaryInteractionPayload {
    sanctuaryPosition: Position;
    mode: SanctuaryInteractionMode;
}

export interface SanctuaryInteractionEffect {
    lifeRestored?: number;
    attackBonus?: number;
    defenseBonus?: number;
    noEffectApplied: boolean;
}

export interface SanctuaryInteractionResultPayload {
    activatingPlayerId: string;
    sanctuaryAnchorPosition: Position;
    sanctuaryType: ObjectType;
    interactionMode: SanctuaryInteractionMode;
    effect: SanctuaryInteractionEffect;
    updatedPlayers: Player[];
    updatedGrid: CellInterface[][];
}

export interface SanctuaryReactivatedPayload {
    updatedGrid: CellInterface[][];
}

export interface PlayersUpdatePayload {
    players: Player[];
}
