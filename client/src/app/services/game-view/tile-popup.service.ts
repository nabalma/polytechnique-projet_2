import { inject, Injectable } from '@angular/core';
import { MapService } from '@app/services/match/map/map.service';
import { CellInterface, CellRightClickPayload } from '@common/interfaces/game-frontend/game-grid-interface';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';

@Injectable()
export class TilePopupService {
    private readonly mapService = inject(MapService);

    visible = false;
    x = 0;
    y = 0;
    player: Player | null = null;
    private position: Position | null = null;

    get cell(): CellInterface | null {
        if (!this.position) return null;
        return this.mapService.gameMap?.grid[this.position.y]?.[this.position.x] ?? null;
    }

    open(payload: CellRightClickPayload, player: Player | null): void {
        this.position = payload.position;
        this.player = player;
        this.x = payload.event.clientX;
        this.y = payload.event.clientY;
        this.visible = true;
    }

    close(): void {
        this.visible = false;
        this.position = null;
    }
}
