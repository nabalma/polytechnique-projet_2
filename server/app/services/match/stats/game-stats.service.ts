import { PERCENT } from '@app/constants/game-play.constants';
import { PLAYER_ABANDONED_FLAG } from '@common/constants/game-view/game-view.constants';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameEndStatsPayload } from '@common/interfaces/game-end/game-end-stats-payload.interface';
import { PlayerCombatStats, PlayerEndStats } from '@common/interfaces/game-end/player-end-stats.interface';
import { CellInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { StatsContext } from '@common/interfaces/statistics/statistics-interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GameStatsService {
    private readonly visitedCells: Map<string, Set<string>> = new Map();
    private readonly doorsToggled: Set<string> = new Set();
    private readonly sanctuariesUsed: Set<string> = new Set();
    private readonly combatStats: Map<string, PlayerCombatStats> = new Map();

    computeTerrainCellCount(grid: CellInterface[][]): number {
        let count = 0;
        for (const row of grid) {
            for (const cell of row) {
                if (cell.tile.tileType !== TileType.WALL) count++;
            }
        }
        return count;
    }

    computeDoorCount(grid: CellInterface[][]): number {
        let count = 0;
        for (const row of grid) {
            for (const cell of row) {
                if (cell.tile.tileType === TileType.DOOR_CLOSED || cell.tile.tileType === TileType.DOOR_OPEN) count++;
            }
        }
        return count;
    }

    computeSanctuaryCount(grid: CellInterface[][]): number {
        let count = 0;
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (this.isSanctuaryTopLeft(grid, x, y)) count++;
            }
        }
        return count;
    }

    private isSanctuaryTopLeft(grid: CellInterface[][], x: number, y: number): boolean {
        const type = grid[y][x].objects?.objectType;
        if (type !== ObjectType.COMBAT_SANCTUARY && type !== ObjectType.HEAL_SANCTUARY) return false;
        if (grid[y][x].objects?.isAnchor) return true;
        const aboveIsSame = grid[y - 1]?.[x]?.objects?.objectType === type;
        const leftIsSame = grid[y]?.[x - 1]?.objects?.objectType === type;
        return !aboveIsSame && !leftIsSame;
    }

    trackVisit(playerId: string, position: Position): void {
        if (!this.visitedCells.has(playerId)) {
            this.visitedCells.set(playerId, new Set());
        }
        this.visitedCells.get(playerId).add(`${position.x},${position.y}`);
    }

    trackDoorToggled(position: Position): void {
        this.doorsToggled.add(`${position.x},${position.y}`);
    }

    trackSanctuaryUsed(position: Position): void {
        this.sanctuariesUsed.add(`${position.x},${position.y}`);
    }

    trackCombatResult(winnerId: string | null, loserId: string | null, participantIds: string[], gameState: GameState): void {
        for (const id of participantIds) {
            this.getOrInitializeCombatStats(id).combatCount++;
        }

        if (!winnerId || !loserId) return;

        const loser = gameState.players.find(player => player.id === loserId);
        if (!loser) return;

        this.getOrInitializeCombatStats(winnerId).victoryCount++;
        this.getOrInitializeCombatStats(winnerId).totalHpDealt += loser.attributes.totalLife;
        this.getOrInitializeCombatStats(loserId).defeatCount++;
        this.getOrInitializeCombatStats(loserId).totalHpLost += loser.attributes.totalLife;
    }

    buildStats(context: StatsContext): GameEndStatsPayload {
        const playerStats: PlayerEndStats[] = context.players.map((player) =>
            this.buildPlayerStats(player, context.terrainCellCount),
        );

        const globalStats = this.buildGlobalStats(context);

        return {
            playerStats,
            ...globalStats,
        };
    }

    private buildGlobalStats(context: StatsContext): Omit<GameEndStatsPayload, 'playerStats'> {
        const totalVisited = this.getTotalVisitedCellsCount();

        return {
            gameDurationMs: Date.now() - context.gameStartTime,
            totalTurns: context.turnNumber,
            hasDoors: context.doorCount > 0,
            doorUsagePercent: context.doorCount > 0 ? (this.doorsToggled.size / context.doorCount) * PERCENT : 0,
            hasSanctuaries: context.sanctuaryCount > 0,
            sanctuaryUsagePercent: context.sanctuaryCount > 0 ? (this.sanctuariesUsed.size / context.sanctuaryCount) * PERCENT : 0,
            visitedTerrainGlobalPercent: context.terrainCellCount > 0 ? (totalVisited / context.terrainCellCount) * PERCENT : 0,
            isCTFMode: context.isCTFMode,
            differentFlagHoldersCount: 0,
        };
    }

    private getTotalVisitedCellsCount(): number {
        const totalVisited = new Set<string>();

        for (const cells of this.visitedCells.values()) {
            for (const key of cells) {
                totalVisited.add(key);
            }
        }

        return totalVisited.size;
    }

    private buildPlayerStats(player: Player, terrainCellCount: number): PlayerEndStats {
        const combat = this.combatStats.get(player.id) ?? {
            combatCount: 0, victoryCount: 0, defeatCount: 0, totalHpLost: 0, totalHpDealt: 0,
        };
        const visitedCount = this.visitedCells.get(player.id)?.size ?? 0;
        const visitedTerrainPercent = terrainCellCount > 0 ? (visitedCount / terrainCellCount) * PERCENT : 0;
        return {
            playerId: player.id,
            playerName: player.name,
            avatarMini: player.avatarMini,
            isAbandoned: player.remainingActions === PLAYER_ABANDONED_FLAG,
            visitedTerrainPercent,
            ...combat,
        };
    }

    private getOrInitializeCombatStats(playerId: string): PlayerCombatStats {
        if (!this.combatStats.has(playerId)) {
            this.combatStats.set(playerId, {
                combatCount: 0, victoryCount: 0, defeatCount: 0, totalHpLost: 0, totalHpDealt: 0,
            });
        }
        return this.combatStats.get(playerId);
    }
}
