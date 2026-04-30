import { PathFindingService } from '@app/services/match/pathfinding/path-finding.service';
import { TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { DoorToggleContext } from '@common/interfaces/match/door-toggle-context.interface';
import { Position } from '@common/interfaces/match/match-interface';

interface DoorGuards {
    activePlayerId: string;
    transitioning: boolean;
    isInCombat: boolean;
}

export class DoorService {
    canCloseDoor(position: Position, state: GameState): boolean {
        return !state.players.some(
            (player) => player.remainingActions !== -1 &&
                player.position.x === position.x &&
                player.position.y === position.y,
        );
    }

    toggleDoor(state: GameState, position: Position): boolean {
        const cell = state.grid[position.y]?.[position.x];
        if (!cell) return false;
        const isClosed = cell.tile.tileType === TileType.DOOR_CLOSED;
        if (!isClosed && cell.tile.tileType !== TileType.DOOR_OPEN) return false;
        cell.tile.tileType = isClosed ? TileType.DOOR_OPEN : TileType.DOOR_CLOSED;
        return true;
    }

    buildDoorToggleContext(
        socketId: string,
        position: Position,
        state: GameState,
        guards: DoorGuards,
        pathFinding: PathFindingService,
    ): DoorToggleContext | null {
        const playerId = state.socketToPlayerId.get(socketId);
        if (!playerId || playerId !== guards.activePlayerId || guards.transitioning || guards.isInCombat) return null;
        const activePlayer = state.players.find(player => player.id === guards.activePlayerId);
        if (!activePlayer || !pathFinding.isAdjacent(activePlayer.position, position)) return null;
        if ((activePlayer.remainingActions ?? 0) <= 0) return null;
        return { playerId, activePlayer };
    }
}
