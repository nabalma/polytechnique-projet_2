import { inject, Injectable } from '@angular/core';
import { CombatService } from '@app/services/combat/combat.service';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import {
    PLAYER_ABANDONED_FLAG,
    SANCTUARY_ACTIVE_MOVE_ERROR,
    SANCTUARY_INACTIVE_MOVE_ERROR,
    WATER_TILE_COST,
} from '@common/constants/game-view/game-view.constants';
import { MOVEMENTS } from '@common/constants/match/match.const';

import { SanctuaryInteractionService } from '@app/services/match/action/sanctuary-interaction.service';
import { FlagTransferService } from '@app/services/match/flag/flag-transfer.service';
import { MapService } from '@app/services/match/map/map.service';
import { MatchService } from '@app/services/match/match.service';
import { GameNotificationService } from '@app/services/match/notification/match-notification.service';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { CellInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { MoveRequestPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { MatchEvents } from '@common/socket_event/match/match.gateway.events';

@Injectable({
    providedIn: 'root',
})
export class MovementService {
    private matchService = inject(MatchService);
    private mapService = inject(MapService);
    private socketService = inject(MatchSocketService);
    private notifications = inject(GameNotificationService);
    private flagTransferService = inject(FlagTransferService);
    private sanctuaryService = inject(SanctuaryInteractionService);
    private combatService = inject(CombatService);

    private isValidPos(pos: Position): boolean {
        const gridSize = this.mapService.gridSize;
        if (!gridSize)
            return false;
        return pos.x >= 0 &&
            pos.y >= 0 &&
            pos.x < gridSize &&
            pos.y < gridSize;
    }

    canMove(): boolean {

        return (
            this.mapService.gameMap &&
            this.matchService.isMyTurn()) ?? false;
    }

    handleMovement(key: string) {

        const movement = MOVEMENTS[key.toLowerCase()];
        if (!this.matchService.isMyTurn()) return;
        if (this.combatService.isInCombat()) return;
        if (this.flagTransferService.waitingForTransferResponse) return;
        if (this.sanctuaryService.showModal()) return;

        const currentPos = this.matchService.currentPos;
        if (!currentPos) return;
        if (!movement) return;
        const newPos = {
            x: currentPos.x + movement.dx,
            y: currentPos.y + movement.dy,
        };

        if (!this.isValidPos(newPos)) return;
        this.attemptMove(newPos);
    }

    private attemptMove(target: Position): void {
        const remainingMoves = this.matchService.remainingMovement;
        const errorMsg = this.getMoveErrorMessage(target, remainingMoves);
        if (errorMsg) {
            this.notifications.showMoveError(errorMsg);
            return;
        }
        const mRequest: MoveRequestPayload = { targetPosition: target };
        this.socketService.send(MatchEvents.RequestMove, mRequest);
    }

    private getMoveErrorMessage(target: Position, remainingMovement: number): string | null {
        if (!this.mapService.grid) return null;
        const cell = this.mapService.grid[target.y]?.[target.x];
        if (!cell) return null;
        const tileType = cell.tile.tileType;
        if (tileType === TileType.WALL) return 'Impossible : mur infranchissable.';
        if (tileType === TileType.DOOR_CLOSED) return 'Impossible : porte fermée. Utilisez une action pour l\'ouvrir.';
        const isReachable = this.matchService.reachableCells().some((c) => c.x === target.x && c.y === target.y);
        if (isReachable) return null;
        const sanctuaryError = this.getSanctuaryMoveError(cell);
        if (sanctuaryError) return sanctuaryError;
        if (this.isPositionOccupied(target)) return 'Déplacement impossible : case occupée par un autre joueur.';
        if (tileType === TileType.WATER && remainingMovement < WATER_TILE_COST) {
            return `Déplacement impossible : l'eau coûte ${WATER_TILE_COST} pts, il vous en reste ${remainingMovement}.`;
        }
        if (remainingMovement <= 0) return 'Plus aucun point de mouvement restant.';
        return null;
    }

    private getSanctuaryMoveError(cell: CellInterface): string | null {
        const objType = cell.objects?.objectType;
        if (objType !== ObjectType.COMBAT_SANCTUARY && objType !== ObjectType.HEAL_SANCTUARY) return null;
        return cell.objects?.isActive === false ? SANCTUARY_INACTIVE_MOVE_ERROR : SANCTUARY_ACTIVE_MOVE_ERROR;
    }

    private isPositionOccupied(target: Position): boolean {
        return [...this.matchService.players().values()].some(
            (player) => player.id !== this.matchService.currentPlayerId
                && player.remainingActions !== PLAYER_ABANDONED_FLAG
                && player.position?.x === target.x && player.position?.y === target.y,
        );
    }
}