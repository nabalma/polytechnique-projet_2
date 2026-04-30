import { Injectable, signal, WritableSignal } from '@angular/core';
import { EditionService } from '@app/services/edition/edition-service/edition.service';
import { TileType } from '@common/enum/game/grid/game-grid.enum';
import { CellInterface, ObjectInterface, TileInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { GameMap } from '@common/interfaces/game-frontend/game-interface';
import { Position } from '@common/interfaces/match/match-interface';


@Injectable({
    providedIn: 'root',
})
export class MapService {
    private _gameMap: WritableSignal<GameMap | null> = signal(null);
    currentPosition: WritableSignal<number | null> = signal(null);

    constructor(
        private editionService: EditionService) {}


    setGameMap(grid: GameMap) {
        this._gameMap.set(grid);
    }

    updateGrid(grid: CellInterface[][]): void {
        const current = this._gameMap();
        if (!current) return;
        this._gameMap.set({ ...current, grid });
    }
    getCoordinates(caseId: number): Position | null {
        const gridSize = this._gameMap()?.gridSize;
        if (!gridSize) return null;
        const y = Math.floor(caseId / gridSize); // row
        const x = caseId % gridSize;             // column
        return { x, y };
    }
    getFlatIndex(pos: Position): number {
        const gridSize = this._gameMap()?.gridSize;
        if (!gridSize)
            return -1;
        return (pos.y * gridSize) + pos.x;
    }
    get gridSize(): number {
        return this._gameMap()?.gridSize ?? 0;
    }

    get grid(): CellInterface[][] | null {
        return this._gameMap()?.grid ?? null;
    }
    getCell(flatIndex: number): CellInterface | null {
        const { x, y } = this.editionService.getIndex(flatIndex, this.gridSize);
        if (!this.grid) return null;
        return (this.grid)[x][y];
    }
    get gameMap() {
        return this._gameMap();
    }

    setCellTileType(position: Position, tileType: TileType): void {
        const currentMap = this._gameMap();
        if (!currentMap) return;
        const existingCell = currentMap.grid[position.y]?.[position.x];
        if (!existingCell) return;
        const newCell = { ...existingCell, tile: { ...existingCell.tile, tileType } };
        const newRow = [...currentMap.grid[position.y]];
        newRow[position.x] = newCell;
        const newGrid = [...currentMap.grid];
        newGrid[position.y] = newRow;
        this._gameMap.set({ ...currentMap, grid: newGrid });
    }

    setCellTile(position: Position, tile: TileInterface): void {
        const currentMap = this._gameMap();
        if (!currentMap) return;
        const existingCell = currentMap.grid[position.y]?.[position.x];
        if (!existingCell) return;
        const newCell = { ...existingCell, tile: { ...tile } };
        const newRow = [...currentMap.grid[position.y]];
        newRow[position.x] = newCell;
        const newGrid = [...currentMap.grid];
        newGrid[position.y] = newRow;
        this._gameMap.set({ ...currentMap, grid: newGrid });
    }

    setCellObject(position: Position, object: ObjectInterface | undefined): void {
        const currentMap = this._gameMap();
        if (!currentMap) return;
        const existingCell = currentMap.grid[position.y]?.[position.x];
        if (!existingCell) return;
        const newCell = { ...existingCell, objects: object };
        const newRow = [...currentMap.grid[position.y]];
        newRow[position.x] = newCell;
        const newGrid = [...currentMap.grid];
        newGrid[position.y] = newRow;
        this._gameMap.set({ ...currentMap, grid: newGrid });
    }
}