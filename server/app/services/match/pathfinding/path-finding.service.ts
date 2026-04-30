import { TILE_COSTS } from '@app/constants/game-play.constants';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { CellInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { Position } from '@common/interfaces/match/match-interface';
import { ReachabilityContext } from '@common/interfaces/match/pathfinding-context.interface';
import { Player } from '@common/interfaces/player/player-interface';
import { Injectable } from '@nestjs/common';

const DIRECTIONS: Position[] = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
const BLOCKING_OBJECT_TYPES = [ObjectType.COMBAT_SANCTUARY, ObjectType.HEAL_SANCTUARY];

@Injectable()
export class PathFindingService {
    computeReachableCells(player: Player, gameState: GameState): Position[] {
        const context: ReachabilityContext = {
            reachable: [{ ...player.position }],
            visited: new Map<string, number>(),
            queue: [{ position: { ...player.position }, cost: 0 }],
        };
        context.visited.set(this.positionToKey(player.position), 0);
        while (context.queue.length > 0) {
            const current = context.queue.shift();
            if (!current) break;
            for (const neighbor of this.getNeighbors(current.position, gameState)) {
                this.tryVisitNeighbor(neighbor, current.cost, player, gameState, context);
            }
        }
        return context.reachable;
    }

    private tryVisitNeighbor(neighbor: Position, currentCost: number, player: Player, gameState: GameState, context: ReachabilityContext): void {
        const cell = gameState.grid[neighbor.y]?.[neighbor.x];
        if (!cell) return;
        const tileCost = TILE_COSTS[cell.tile.tileType];
        if (tileCost === undefined) return;
        const totalCost = currentCost + tileCost;
        if (totalCost > player.remainingMovement) return;
        const cellKey = this.positionToKey(neighbor);
        const previousCost = context.visited.get(cellKey);
        if (previousCost !== undefined && previousCost <= totalCost) return;
        if (this.isOccupiedByPlayer(neighbor, player.id, gameState.players)) return;
        if (this.hasBlockingObject(cell)) return;
        const isFirstVisit = previousCost === undefined;
        context.visited.set(cellKey, totalCost);
        if (isFirstVisit) context.reachable.push(neighbor);
        context.queue.push({ position: neighbor, cost: totalCost });
    }

    getNeighbors(position: Position, gameState: GameState): Position[] {
        return DIRECTIONS
            .map((direction) => ({ x: position.x + direction.x, y: position.y + direction.y }))
            .filter((candidate) =>
                candidate.x >= 0 &&
                candidate.y >= 0 &&
                candidate.x < gameState.gridSize &&
                candidate.y < gameState.gridSize,
            )
            .filter((candidate) => {
                const cell = gameState.grid[candidate.y][candidate.x];
                return cell.tile.tileType !== TileType.WALL && cell.tile.tileType !== TileType.DOOR_CLOSED;
            });
    }

    isOccupiedByPlayer(targetPosition: Position, excludeId: string, players: Player[]): boolean {
        return players.some(
            (player) =>
                player.id !== excludeId &&
                player.remainingActions !== -1 &&
                player.position.x === targetPosition.x &&
                player.position.y === targetPosition.y,
        );
    }

    findRespawnPosition(player: Player, gameState: GameState): Position {
        const origin = player.startPosition;
        const candidates: { position: Position; distance: number }[] = [];

        for (let y = 0; y < gameState.gridSize; y++) {
            for (let x = 0; x < gameState.gridSize; x++) {
                const distance = Math.abs(x - origin.x) + Math.abs(y - origin.y);
                candidates.push({ position: { x, y }, distance });
            }
        }

        candidates.sort((cellA, cellB) => cellA.distance - cellB.distance);

        for (const candidate of candidates) {
            if (!this.isOccupiedByPlayer(candidate.position, player.id, gameState.players)) {
                return candidate.position;
            }
        }

        return origin;
    }

    getAdjacentPlayers(player: Player, gameState: GameState): Player[] {
        const neighbors = this.getNeighbors(player.position, gameState);
        return gameState.players.filter(
            (candidate) =>
                candidate.id !== player.id &&
                candidate.remainingActions !== -1 &&
                neighbors.some((neighbor) => neighbor.x === candidate.position.x && neighbor.y === candidate.position.y),
        );
    }

    isAdjacent(positionA: Position, positionB: Position): boolean {
        const deltaX = Math.abs(positionA.x - positionB.x);
        const deltaY = Math.abs(positionA.y - positionB.y);
        return (deltaX === 1 && deltaY === 0) || (deltaX === 0 && deltaY === 1);
    }

    isAdjacentToClosedDoor(position: Position, gameState: GameState): boolean {
        return DIRECTIONS.some((direction) => {
            const cell = gameState.grid[position.y + direction.y]?.[position.x + direction.x];
            return cell?.tile?.tileType === TileType.DOOR_CLOSED;
        });
    }

    isWalkableTile(cell: CellInterface): boolean {
        return cell.tile.tileType !== TileType.WALL && cell.tile.tileType !== TileType.DOOR_CLOSED;
    }

    hasBlockingObject(cell: CellInterface): boolean {
        return !!cell.objects && BLOCKING_OBJECT_TYPES.includes(cell.objects.objectType);
    }

    private positionToKey(position: Position): string {
        return `${position.x},${position.y}`;
    }
}
