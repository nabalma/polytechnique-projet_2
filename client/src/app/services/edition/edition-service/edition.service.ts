import { HttpClient } from '@angular/common/http';
import { ElementRef, Injectable, WritableSignal } from '@angular/core';
import { EditionTool } from '@app/services/edition-tools/edition-tool';
import {
    canPlaceSanctuaryAt,
    getSanctuaryFootprint,
    getSanctuaryImageParts,
    isSanctuary,
} from '@app/services/edition/edition-service/utils/edition-page.utils';
import { CANVAS_SCALE, EMPTY_GRID_ID, IMAGE_QUALITY_FORMAT } from '@common/constants/edition/edition.constants';
import { GridSize, ObjectType, SanctuaryPart, TileType } from '@common/enum/game/grid/game-grid.enum';
import { CloudinaryResponse } from '@common/interfaces/cloudinary/cloudinary-interface';
import { ObjectPlacementResult, SanctuaryPlacementResult, TilePlacementResult } from '@common/interfaces/edition/edition.interface';
import {
    SanctuaryCellConfig,
    SanctuaryGridBuildContext,
} from '@common/interfaces/edition/sanctuary-cell-config.interface';
import { CellInterface, ObjectInterface, TileInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { CoordinateGrid, GameInterface, GameMap } from '@common/interfaces/game-frontend/game-interface';
import html2canvas from 'html2canvas';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { environmentCloudinaryUrl } from 'src/environments/environments-cloudinary';

@Injectable({ providedIn: 'root' })
export class EditionService {


    private readonly baseUrl: string = environment.serverUrl;


    constructor(private http: HttpClient, private editionTool: EditionTool) {}

    getIndex(caseId: number, gridSize: GridSize): CoordinateGrid {
        const indexX: number = Math.floor(caseId / gridSize);
        const indexY: number = caseId % gridSize;

        return { x: indexX, y: indexY };
    }

    async captureAndCreateUrl(divImage: ElementRef): Promise<string> {
        const elementToCapture = divImage.nativeElement;
        const canvasImage = await html2canvas(elementToCapture, this.html2CanvasOption(divImage));

        const blobImage: Blob = await new Promise((resolve, reject) => {
            canvasImage.toBlob(
                (blob) => (blob ? resolve(blob) : reject('Image generation failed')),
                'image/jpeg',
                IMAGE_QUALITY_FORMAT,
            );
        });

        const fileImage = new File([blobImage], 'capture_jeu.jpg', { type: 'image/jpeg' });

        return await this.uploadToCloudinary(fileImage);

    }

    private html2CanvasOption(divImage: ElementRef) {
        const elementToCapture = divImage.nativeElement;
        return {
            width: elementToCapture.clientWidth,
            height: elementToCapture.clientHeight,
            scale: CANVAS_SCALE,
            useCORS: true,
        };
    }

    private async uploadToCloudinary(imageCreated: File) {
        const formData = new FormData();

        formData.append('file', imageCreated);
        formData.append('upload_preset', 'equipe_204');
        formData.append('folder', 'LOG2995/client');

        const response = await lastValueFrom(
            this.http.post<CloudinaryResponse>(environmentCloudinaryUrl.url, formData));

        return response.public_id;
    }

    async updateGame(id: string, patch: Partial<GameInterface>): Promise<string | null> {
        const response = await lastValueFrom(this.http.patch(
            `${this.baseUrl}/game/${id}`, patch, {
            observe: 'response',
            responseType: 'text',
        }));

        return response.body;
    };


    async getGameById(id: string): Promise<GameInterface> {
        const response = await lastValueFrom
            (this.http.get<GameInterface>(`${this.baseUrl}/game/${id}`));
        const game: GameInterface = response;
        return game;
    }


    async addGame(newGame: GameInterface): Promise<void> {
        await lastValueFrom(this.http.post(`${this.baseUrl}/game`, newGame,
            { observe: 'response', responseType: 'text' }));
    }

    createEmptyGrid(size: GridSize = GridSize.SMALL): GameMap {
        const grid: GameMap = {

            id: EMPTY_GRID_ID,
            gridSize: size,
            grid: Array.from({ length: size }, () =>

                Array.from({ length: size }, () => ({
                    tile: this.editionTool.createDefaultTile(),
                    objects: this.editionTool.createDefaultObject(),
                }))),

        };

        return grid;
    }

    resolveTileToPlace(currentTile: TileInterface, selectedTile: TileInterface): TileInterface {
        if (currentTile.tileType === TileType.DOOR_CLOSED && selectedTile.tileType === TileType.DOOR_CLOSED) {
            return this.editionTool.createDoorTileOpen();
        }
        if (currentTile.tileType === TileType.DOOR_OPEN && selectedTile.tileType === TileType.DOOR_CLOSED) {
            return this.editionTool.createDoorTileClosed();
        }
        return selectedTile;
    }

    isDoorTile(tileType: TileType): boolean {
        return tileType === TileType.DOOR_OPEN || tileType === TileType.DOOR_CLOSED;
    }

    applyTileToCell(gameMap: WritableSignal<GameMap>, tile: TileInterface, x: number, y: number): void {
        gameMap.update((currentMap) => {
            const updatedGrid = [...currentMap.grid];
            const resolvedTile = this.resolveTileToPlace(updatedGrid[x][y].tile, tile);
            updatedGrid[x][y] = { ...updatedGrid[x][y], tile: resolvedTile };
            return { ...currentMap, grid: updatedGrid };
        });
    }

    applyObjectToCell(gameMap: WritableSignal<GameMap>, object: ObjectInterface, x: number, y: number): void {
        gameMap.update((currentMap) => {
            const updatedGrid = [...currentMap.grid];
            updatedGrid[x][y] = { ...updatedGrid[x][y], objects: object };
            return { ...currentMap, grid: updatedGrid };
        });
    }

    findSanctuaryAnchor(gameMap: WritableSignal<GameMap>, x: number, y: number, object: ObjectInterface): { x: number; y: number } {
        if (object.anchorX !== undefined && object.anchorY !== undefined) {
            return { x: object.anchorX, y: object.anchorY };
        }
        const currentMap = gameMap();
        for (let anchorX = x - 1; anchorX <= x; anchorX++) {
            for (let anchorY = y - 1; anchorY <= y; anchorY++) {
                const isMatchingFootprint = getSanctuaryFootprint(anchorX, anchorY).every(({ x: cellX, y: cellY }) => {
                    return currentMap.grid[cellX]?.[cellY]?.objects?.objectType === object.objectType;
                });
                if (isMatchingFootprint) return { x: anchorX, y: anchorY };
            }
        }
        return { x, y };
    }

    placeSanctuaryOnGrid(gameMap: WritableSignal<GameMap>, objectToPlace: ObjectInterface, x: number, y: number): void {
        const context: SanctuaryGridBuildContext = {
            objectToPlace,
            imageParts: getSanctuaryImageParts(objectToPlace.objectType),
            objectId: `${objectToPlace.objectType}-${x}-${y}-${Date.now()}`,
            anchorX: x,
            anchorY: y,
        };
        gameMap.update((currentMap) => this.buildSanctuaryGrid(currentMap, context));
    }

    private buildSanctuaryGrid(currentMap: GameMap, context: SanctuaryGridBuildContext): GameMap {
        const grid = currentMap.grid.map((row) => [...row]);
        this.applyTopRowCells(grid, context);
        this.applyBottomRowCells(grid, context);
        return { ...currentMap, grid };
    }

    private applyTopRowCells(grid: CellInterface[][], context: SanctuaryGridBuildContext): void {
        const { objectToPlace, imageParts, objectId, anchorX, anchorY } = context;
        grid[anchorX][anchorY].objects = this.buildSanctuaryCell({
            objectToPlace, imageSrc: imageParts.topLeft, objectId,
            anchorX, anchorY, isAnchor: true, sanctuaryPart: SanctuaryPart.TopLeft,
        });
        grid[anchorX][anchorY + 1].objects = this.buildSanctuaryCell({
            objectToPlace, imageSrc: imageParts.topRight, objectId,
            anchorX, anchorY, isAnchor: false, sanctuaryPart: SanctuaryPart.TopRight,
        });
    }

    private applyBottomRowCells(grid: CellInterface[][], context: SanctuaryGridBuildContext): void {
        const { objectToPlace, imageParts, objectId, anchorX, anchorY } = context;
        grid[anchorX + 1][anchorY].objects = this.buildSanctuaryCell({
            objectToPlace, imageSrc: imageParts.bottomLeft, objectId,
            anchorX, anchorY, isAnchor: false, sanctuaryPart: SanctuaryPart.BottomLeft,
        });
        grid[anchorX + 1][anchorY + 1].objects = this.buildSanctuaryCell({
            objectToPlace, imageSrc: imageParts.bottomRight, objectId,
            anchorX, anchorY, isAnchor: false, sanctuaryPart: SanctuaryPart.BottomRight,
        });
    }

    removeSanctuaryFromGrid(gameMap: WritableSignal<GameMap>, anchorX: number, anchorY: number, objectId?: string, objectType?: ObjectType): void {
        const legacyFootprint = getSanctuaryFootprint(anchorX, anchorY);
        gameMap.update((currentMap) => {
            const updatedGrid = currentMap.grid.map((row) => [...row]);
            for (let x = 0; x < currentMap.gridSize; x++) {
                for (let y = 0; y < currentMap.gridSize; y++) {
                    const object = updatedGrid[x][y].objects;
                    const sameAnchor = object?.anchorX === anchorX && object?.anchorY === anchorY;
                    const sameObjectId = objectId && object?.objectId === objectId;
                    const matchesFootprint = legacyFootprint.some((cell) => cell.x === x && cell.y === y);
                    const isLegacyCell = objectType !== undefined && matchesFootprint && object?.objectType === objectType;
                    if (sameAnchor || sameObjectId || isLegacyCell) {
                        updatedGrid[x][y] = { ...updatedGrid[x][y], objects: this.editionTool.createDefaultObject() };
                    }
                }
            }
            return { ...currentMap, grid: updatedGrid };
        });
    }

    removeObjectFromCell(gameMap: WritableSignal<GameMap>, x: number, y: number): ObjectInterface | null {
        const object = gameMap().grid[x][y].objects;
        if (!object || object.objectType === ObjectType.DEFAULT) return null;
        if (isSanctuary(object)) {
            const anchor = this.findSanctuaryAnchor(gameMap, x, y, object);
            this.removeSanctuaryFromGrid(gameMap, anchor.x, anchor.y, object.objectId, object.objectType);
        } else {
            this.applyObjectToCell(gameMap, this.editionTool.createDefaultObject(), x, y);
        }
        return object;
    }

    removeTileFromCell(gameMap: WritableSignal<GameMap>, x: number, y: number): void {
        gameMap.update((currentMap) => {
            const updatedGrid = [...currentMap.grid];
            updatedGrid[x][y] = { ...updatedGrid[x][y], tile: this.editionTool.createDefaultTile() };
            return { ...currentMap, grid: updatedGrid };
        });
    }

    handleTilePlacement(gameMap: WritableSignal<GameMap>, selectedTile: TileInterface, x: number, y: number): TilePlacementResult {
        const currentCell = gameMap().grid[x][y];
        const isModifiable = this.isDoorTile(currentCell.tile.tileType) || currentCell.tile.tileType !== selectedTile.tileType;
        if (!isModifiable) return { placed: false, requiresSanctuaryOverwrite: false };
        if (currentCell.objects && isSanctuary(currentCell.objects)) {
            return { placed: false, requiresSanctuaryOverwrite: true };
        }
        this.applyTileToCell(gameMap, selectedTile, x, y);
        const removedObject = selectedTile.tileType === TileType.WALL ? this.removeObjectFromCell(gameMap, x, y) : null;
        return { placed: true, requiresSanctuaryOverwrite: false, ...(removedObject ? { removedObject } : {}) };
    }

    handleSanctuaryPlacement(gameMap: WritableSignal<GameMap>, selectedObject: ObjectInterface, x: number, y: number): SanctuaryPlacementResult {
        if (selectedObject.quantity === 0) return { placed: false, hasError: false };
        if (!canPlaceSanctuaryAt(x, y, gameMap().grid)) return { placed: false, hasError: true };
        this.placeSanctuaryOnGrid(gameMap, selectedObject, x, y);
        return { placed: true, hasError: false };
    }

    handleObjectPlacement(gameMap: WritableSignal<GameMap>, selectedObject: ObjectInterface, x: number, y: number): ObjectPlacementResult {
        const currentCell = gameMap().grid[x][y];
        const actualObject = currentCell.objects;
        if (!selectedObject || selectedObject.quantity === 0) return { placed: false };
        if (actualObject?.objectType === selectedObject.objectType) return { placed: false };
        if (this.isDoorTile(currentCell.tile.tileType) || currentCell.tile.tileType === TileType.WALL) return { placed: false, blockedByTile: true };
        const replacedObject = actualObject && actualObject.objectType !== ObjectType.DEFAULT ? actualObject : undefined;
        this.applyObjectToCell(gameMap, selectedObject, x, y);
        return { placed: true, ...(replacedObject ? { replacedObject } : {}) };
    }

    confirmSanctuaryTileOverwrite(
        gameMap: WritableSignal<GameMap>, selectedTile: TileInterface | null, x: number, y: number,
    ): ObjectInterface | null {
        const object = gameMap().grid[x][y].objects;
        let removedObject: ObjectInterface | null = null;
        if (object && isSanctuary(object)) {
            const anchor = this.findSanctuaryAnchor(gameMap, x, y, object);
            this.removeSanctuaryFromGrid(gameMap, anchor.x, anchor.y, object.objectId, object.objectType);
            removedObject = object;
        }
        this.applyTileToCell(gameMap, selectedTile ?? this.editionTool.createDefaultTile(), x, y);
        return removedObject;
    }

    private buildSanctuaryCell(config: SanctuaryCellConfig): ObjectInterface {
        const { objectToPlace, imageSrc, objectId, anchorX, anchorY, isAnchor, sanctuaryPart } = config;
        return { ...objectToPlace, imageSrc, objectId, anchorX, anchorY, isAnchor, sanctuaryPart };
    }
}