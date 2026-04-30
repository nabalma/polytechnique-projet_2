import { inject, Injectable, signal } from '@angular/core';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';

import { MapService } from '@app/services/match/map/map.service';
import { MatchService } from '@app/services/match/match.service';
import { SANCTUARY_SIDE_LENGTH } from '@common/constants/sanctuary/sanctuary.constants';
import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import {
    RequestSanctuaryInteractionPayload,
    SanctuaryInteractionMode,
    SanctuaryInteractionResultPayload,
    SanctuaryReactivatedPayload,
} from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { MatchEvents } from '@common/socket_event/match/match.gateway.events';

@Injectable({ providedIn: 'root' })
export class SanctuaryInteractionService {
    private readonly socketService = inject(MatchSocketService);
    private readonly matchService = inject(MatchService);
    private readonly mapService = inject(MapService);

    readonly showModal = signal<boolean>(false);
    readonly pendingPosition = signal<Position | null>(null);
    readonly pendingSanctuaryType = signal<ObjectType | null>(null);

    openModal(position: Position, sanctuaryType: ObjectType): void {
        this.pendingPosition.set(position);
        this.pendingSanctuaryType.set(sanctuaryType);
        this.showModal.set(true);
    }

    cancel(): void {
        this.showModal.set(false);
        this.pendingPosition.set(null);
        this.pendingSanctuaryType.set(null);
    }

    confirm(mode: SanctuaryInteractionMode): void {
        const position = this.pendingPosition();
        if (!position) return;
        const payload: RequestSanctuaryInteractionPayload = { sanctuaryPosition: position, mode };
        this.socketService.send(MatchEvents.RequestSanctuaryInteraction, payload);
        this.cancel();
    }

    registerListeners(): void {
        this.socketService.on<SanctuaryInteractionResultPayload>(MatchEvents.SanctuaryInteractionResult)
            ?.subscribe((result) => this.handleSanctuaryResult(result));
        this.socketService.on<SanctuaryReactivatedPayload>(MatchEvents.SanctuaryReactivated)
            ?.subscribe((payload) => this.handleSanctuaryReactivated(payload));
    }

    private handleSanctuaryReactivated(payload: SanctuaryReactivatedPayload): void {
        const currentMap = this.mapService.gameMap;
        if (currentMap) {
            this.mapService.setGameMap({ gridSize: currentMap.gridSize, grid: payload.updatedGrid });
        }
    }

    private handleSanctuaryResult(result: SanctuaryInteractionResultPayload): void {
        const currentMap = this.mapService.gameMap;
        if (currentMap) {
            this.mapService.setGameMap({ gridSize: currentMap.gridSize, grid: result.updatedGrid });
        }
        this.matchService.players.update((playersMap) => {
            const updatedMap = new Map(playersMap);
            for (const updatedPlayer of result.updatedPlayers) {
                if (updatedPlayer.id) updatedMap.set(updatedPlayer.id, updatedPlayer);
            }
            return updatedMap;
        });

        this.matchService.handleSanctuaryAction(result.sanctuaryType);
    }

    isSanctuaryActive(flatIndex: number): boolean {
        const position = this.flatIndexToPosition(flatIndex);
        if (!position) return false;
        const cell = this.mapService.grid?.[position.y]?.[position.x];
        if (!cell?.objects) return false;
        return cell.objects.isActive !== false;
    }

    isSanctuaryCell(flatIndex: number): boolean {
        const position = this.flatIndexToPosition(flatIndex);
        if (!position) return false;
        const cell = this.mapService.grid?.[position.y]?.[position.x];
        if (!cell?.objects) return false;
        return cell.objects.objectType === ObjectType.COMBAT_SANCTUARY
            || cell.objects.objectType === ObjectType.HEAL_SANCTUARY;
    }

    getSanctuaryTypeAt(flatIndex: number): ObjectType | null {
        const position = this.flatIndexToPosition(flatIndex);
        if (!position) return null;
        const cell = this.mapService.grid?.[position.y]?.[position.x];
        if (!cell?.objects) return null;
        const { objectType } = cell.objects;
        if (objectType === ObjectType.COMBAT_SANCTUARY || objectType === ObjectType.HEAL_SANCTUARY) return objectType;
        return null;
    }

    getPositionAt(flatIndex: number): Position | null {
        return this.flatIndexToPosition(flatIndex);
    }

    isPlayerAdjacentToSanctuary(flatIndex: number, playerPosition: Position): boolean {
        const gridSize = this.mapService.gridSize;
        if (!gridSize) return false;
        const position = this.flatIndexToPosition(flatIndex);
        if (!position) return false;
        const anchor = this.findSanctuaryAnchorPosition(position);
        if (!anchor) return false;
        for (let row = 0; row < SANCTUARY_SIDE_LENGTH; row++) {
            for (let col = 0; col < SANCTUARY_SIDE_LENGTH; col++) {
                const cellPos: Position = { x: anchor.x + col, y: anchor.y + row };
                if (cellPos.x < gridSize && cellPos.y < gridSize && this.isAdjacentTo(playerPosition, cellPos)) return true;
            }
        }
        return false;
    }

    private findSanctuaryAnchorPosition(position: Position): Position | null {
        const cell = this.mapService.grid?.[position.y]?.[position.x];
        if (!cell?.objects) return null;
        if (cell.objects.isAnchor) return position;
        if (cell.objects.anchorX !== undefined && cell.objects.anchorY !== undefined) {
            return { x: cell.objects.anchorX, y: cell.objects.anchorY };
        }
        const type = cell.objects.objectType;
        for (let dy = 0; dy < SANCTUARY_SIDE_LENGTH; dy++) {
            for (let dx = 0; dx < SANCTUARY_SIDE_LENGTH; dx++) {
                const candidate: Position = { x: position.x - dx, y: position.y - dy };
                if (this.isTopLeftOfSanctuaryBlock(candidate, type)) return candidate;
            }
        }
        return null;
    }

    private isTopLeftOfSanctuaryBlock(pos: Position, type: ObjectType): boolean {
        for (let row = 0; row < SANCTUARY_SIDE_LENGTH; row++) {
            for (let col = 0; col < SANCTUARY_SIDE_LENGTH; col++) {
                if (this.mapService.grid?.[pos.y + row]?.[pos.x + col]?.objects?.objectType !== type) return false;
            }
        }
        return true;
    }

    private isAdjacentTo(posA: Position, posB: Position): boolean {
        const dx = Math.abs(posA.x - posB.x);
        const dy = Math.abs(posA.y - posB.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    private flatIndexToPosition(flatIndex: number): Position | null {
        const gridSize = this.mapService.gridSize;
        if (!gridSize) return null;
        return { x: flatIndex % gridSize, y: Math.floor(flatIndex / gridSize) };
    }
}
