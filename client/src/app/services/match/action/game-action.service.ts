import { inject, Injectable } from '@angular/core';
import { WaitingRoomStateService } from '@app/services/waiting-room/room-state/waiting-room-state.service';
import { SANCTUARY_INACTIVE_ACTION_ERROR } from '@common/constants/game-view/game-view.constants';
import { TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { FlagTransferService } from '@app/services/match/flag/flag-transfer.service';
import { MapService } from '@app/services/match/map/map.service';
import { MatchService } from '@app/services/match/match.service';
import { GameNotificationService } from '@app/services/match/notification/match-notification.service';
import { SanctuaryInteractionService } from './sanctuary-interaction.service';

@Injectable({ providedIn: 'root' })
export class GameActionService {
    readonly flagTransferService = inject(FlagTransferService);
    private readonly matchService = inject(MatchService);
    private readonly mapService = inject(MapService);
    private readonly stateService = inject(WaitingRoomStateService);
    private readonly sanctuaryService = inject(SanctuaryInteractionService);
    private readonly notifications = inject(GameNotificationService);

    handleCellClick(flatIndex: number): void {
        if (!this.matchService.isMyTurn() || !this.matchService.actionMode) return;
        if (this.flagTransferService.waitingForTransferResponse) return;
        if (this.sanctuaryService.showModal()) return;
        const currentPlayer = this.matchService.currentPlayer;
        if (!currentPlayer?.position || (currentPlayer.remainingActions ?? 0) <= 0) return;
        const position = this.flatIndexToPosition(flatIndex);
        // Sanctuary check must come before the strict adjacency guard because
        // the sanctuary spans a 2×2 block — only 1 or 2 of its cells are
        // directly adjacent to the player, but any of the 4 should be clickable.
        if (this.tryHandleSanctuary(position, flatIndex, currentPlayer.position)) return;
        if (!this.isAdjacentTo(position, currentPlayer.position)) return;
        if (this.tryHandleDoor(position)) return;
        this.handlePlayerInteraction(position);
    }

    private tryHandleDoor(position: Position): boolean {
        const cell = this.mapService.grid?.[position.y]?.[position.x];
        const tileType = cell?.tile?.tileType;
        if (tileType !== TileType.DOOR_OPEN && tileType !== TileType.DOOR_CLOSED) return false;
        this.matchService.requestToggleDoor(position);
        this.matchService.actionMode = false;
        return true;
    }

    private tryHandleSanctuary(position: Position, flatIndex: number, playerPosition: Position): boolean {
        const sanctuaryType = this.sanctuaryService.getSanctuaryTypeAt(flatIndex);
        if (!sanctuaryType) return false;
        if (!this.sanctuaryService.isPlayerAdjacentToSanctuary(flatIndex, playerPosition)) return false;
        if (!this.sanctuaryService.isSanctuaryActive(flatIndex)) {
            this.notifications.showMoveError(SANCTUARY_INACTIVE_ACTION_ERROR);
            return true;
        }
        this.sanctuaryService.openModal(position, sanctuaryType);
        this.matchService.actionMode = false;
        return true;
    }

    private handlePlayerInteraction(position: Position): void {
        const targetPlayer = this.findPlayerAtPosition(position);
        if (!targetPlayer?.id) return;
        if (this.stateService.gameMode() === GameMode.CTF && this.isTeammate(targetPlayer)) {
            this.flagTransferService.handleTeammateAction();
        } else {
            this.matchService.requestAttack(targetPlayer.id);
        }
        this.matchService.actionMode = false;
    }

    private isAdjacentTo(a: Position, b: Position): boolean {
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    private isTeammate(target: Player): boolean {
        const currentPlayer = this.matchService.currentPlayer;
        return !!currentPlayer?.team && target.team === currentPlayer.team;
    }

    private flatIndexToPosition(flatIndex: number): Position {
        const gridSize = this.mapService.gridSize;
        return { x: flatIndex % gridSize, y: Math.floor(flatIndex / gridSize) };
    }

    private findPlayerAtPosition(position: Position): Player | undefined {
        return Array.from(this.matchService.players().values()).find(
            (player) =>
                player.id !== this.matchService.currentPlayerId &&
                player.remainingActions !== -1 &&
                player.position?.x === position.x &&
                player.position?.y === position.y,
        );
    }
}
