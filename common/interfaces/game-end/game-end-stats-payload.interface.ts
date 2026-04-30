import { PlayerEndStats } from './player-end-stats.interface';

export interface GameEndStatsPayload {
    playerStats: PlayerEndStats[];
    gameDurationMs: number;
    totalTurns: number;
    hasDoors: boolean;
    doorUsagePercent: number;
    hasSanctuaries: boolean;
    sanctuaryUsagePercent: number;
    visitedTerrainGlobalPercent: number;
    isCTFMode: boolean;
    differentFlagHoldersCount: number;
}
