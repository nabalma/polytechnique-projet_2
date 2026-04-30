import { TILE_COSTS } from '@app/constants/game-play.constants';
import { PathFindingService } from '@app/services/match/pathfinding/path-finding.service';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MovementService {
    private readonly pathFinding: PathFindingService = new PathFindingService();

    movePlayer(playerId: string, target: Position, gameState: GameState): { success: boolean; cost: number } {
        const player = gameState.players.find((candidate) => candidate.id === playerId);
        if (!player) return { success: false, cost: 0 };

        const cell = gameState.grid[target.y]?.[target.x];
        if (!cell) return { success: false, cost: 0 };

        if (!this.pathFinding.isWalkableTile(cell)) return { success: false, cost: 0 };

        const tileCost = TILE_COSTS[cell.tile.tileType];
        if (tileCost === undefined || tileCost > player.remainingMovement) return { success: false, cost: 0 };
        if (!this.pathFinding.isAdjacent(player.position, target)) return { success: false, cost: 0 };
        if (this.pathFinding.isOccupiedByPlayer(target, playerId, gameState.players)) return { success: false, cost: 0 };

        player.remainingMovement -= tileCost;
        player.position = { x: target.x, y: target.y };
        return { success: true, cost: tileCost };
    }

    teleportPlayer(playerId: string, target: Position, gameState: GameState): boolean {
        const player = gameState.players.find((candidate) => candidate.id === playerId);
        if (!player) return false;

        const cell = gameState.grid[target.y]?.[target.x];
        if (!cell) return false;
        if (!this.pathFinding.isWalkableTile(cell)) return false;
        if (this.pathFinding.hasBlockingObject(cell)) return false;
        if (this.pathFinding.isOccupiedByPlayer(target, playerId, gameState.players)) return false;

        player.position = { x: target.x, y: target.y };
        return true;
    }

    findRespawnPosition(player: Player, gameState: GameState): Position {
        return this.pathFinding.findRespawnPosition(player, gameState);
    }
}
