import { HttpErrorResponse } from '@angular/common/http';
import { WritableSignal } from '@angular/core';
import { EditionTool } from '@app/services/edition-tools/edition-tool';
import { LargeQuantity, MediumQuantity, SmallQuantity } from '@common/enum/edition/edition.enum';
import { GridSize, ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { GridObjectCounts, GridObjectLimits } from '@common/interfaces/edition/edition.interface';
import { SanctuaryImageParts } from '@common/interfaces/edition/sanctuary-cell-config.interface';
import { CellInterface, ObjectInterface, TileInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { GameInterface, GameMap } from '@common/interfaces/game-frontend/game-interface';

/**
 * Ceci est necessaire puisque nous devons utiliser  WritableSignal qui n'est possible que dans un dossier Angular 
 * et ainsi ne peut etre dans le dossier common
 */
export interface UpdateObjectsByGridSizeParams {
    gridSize: GridSize;
    numberSanctuaryTotal: number;
    numberStartingPoint: number;
    editionTool: EditionTool;
    sanctuaryCombat: WritableSignal<ObjectInterface>;
    sanctuarySante: WritableSignal<ObjectInterface>;
    startingPoint: WritableSignal<ObjectInterface>;
}
// Exception temporaire : la logique de compatibilite des anciens sanctuaires
// necessite plusieurs verifications de voisinage, ce qui augmente la complexite.
// eslint-disable-next-line complexity
function isLegacySanctuaryAnchor(currentMap: GameMap, x: number, y: number, objectType: ObjectType): boolean {
    const currentObject = currentMap.grid[x]?.[y]?.objects;
    const rightObject = currentMap.grid[x]?.[y + 1]?.objects;
    const bottomObject = currentMap.grid[x + 1]?.[y]?.objects;
    const bottomRightObject = currentMap.grid[x + 1]?.[y + 1]?.objects;
    const topObject = currentMap.grid[x - 1]?.[y]?.objects;
    const leftObject = currentMap.grid[x]?.[y - 1]?.objects;

    return (
        currentObject?.objectType === objectType &&
        rightObject?.objectType === objectType &&
        bottomObject?.objectType === objectType &&
        bottomRightObject?.objectType === objectType &&
        topObject?.objectType !== objectType &&
        leftObject?.objectType !== objectType
    );
}
//eslint-disable-next-line
export function countObjectsInGrid(currentMap: GameMap): GridObjectCounts {
    let numberStartingPoint = 0;
    let numberSanctuaryTotal = 0;
    let numberFlag = 0;
    const gridSize = currentMap.gridSize;

    for (let cellIndex = 0; cellIndex < gridSize * gridSize; cellIndex++) {
        const rowIndex: number = Math.floor(cellIndex / gridSize);
        const columnIndex: number = cellIndex % gridSize;
        const object = currentMap.grid[rowIndex][columnIndex].objects;
        const objectType = object?.objectType;

        if (objectType === ObjectType.START_POINT) {
            numberStartingPoint++;
        } else if (
            object &&
            (objectType === ObjectType.COMBAT_SANCTUARY || objectType === ObjectType.HEAL_SANCTUARY) &&
            (object.isAnchor || isLegacySanctuaryAnchor(currentMap, rowIndex, columnIndex, objectType))
        ) {
            numberSanctuaryTotal++;
        } else if (objectType === ObjectType.FLAG) {
            numberFlag++;
        }
    }

    return { numberFlag, numberSanctuaryTotal, numberStartingPoint };
}


function getObjectLimitsByGridSize(gridSize: GridSize): GridObjectLimits {
    switch (gridSize) {
        case GridSize.SMALL:
            return {
                sanctuaryTotal: SmallQuantity.SanctuaryTotal,
                startingPoint: SmallQuantity.StartingPoint,
            };
        case GridSize.MEDIUM:
            return {
                sanctuaryTotal: MediumQuantity.SanctuaryTotal,
                startingPoint: MediumQuantity.StartingPoint,
            };
        case GridSize.LARGE:
            return {
                sanctuaryTotal: LargeQuantity.SanctuaryTotal,
                startingPoint: LargeQuantity.StartingPoint,
            };
    }
}

export function updateObjectsByGridSize(params: UpdateObjectsByGridSizeParams): void {
    const { gridSize, numberSanctuaryTotal, numberStartingPoint, editionTool, sanctuaryCombat, sanctuarySante, startingPoint } = params;

    const limits = getObjectLimitsByGridSize(gridSize);
    const remainingSanctuaryTotal = limits.sanctuaryTotal - numberSanctuaryTotal;

    sanctuaryCombat.set(editionTool.createSanctuaryObjectCombat(remainingSanctuaryTotal));
    sanctuarySante.set(editionTool.createSanctuaryObjectSante(remainingSanctuaryTotal));
    startingPoint.set(editionTool.createStartingPointObject(limits.startingPoint - numberStartingPoint));
}

export function isGameNameOrDescriptionMissing(game: Pick<GameInterface, 'name' | 'description'>): boolean {
    return !game.name?.trim() || !game.description?.trim();
}

export function partialGameInterface(game: GameInterface, gameMap: GameMap): Partial<GameInterface> {
    return {
        description: game.description,
        grid: gameMap,
        imageUrl: game.imageUrl,
    };
}

export function extractErrors(error: unknown): string[] {
    if (!(error instanceof HttpErrorResponse)) {
        return ['Erreur inconnue.'];
    }

    let body: { message?: string; error?: unknown } | null = null;
    if (typeof error.error === 'string') {
        try {
            body = JSON.parse(error.error);
        } catch {
            body = null;
        }
    } else if (typeof error.error === 'object') {
        body = error.error;
    }

    if (Array.isArray(body?.error)) return body.error as string[];
    if (typeof body?.message === 'string') return [body.message];
    return ['Erreur inconnue.'];
}

export function syncSelectedObjectReference(
    selectedObject: ObjectInterface | null,
    flag: ObjectInterface,
    sanctuaryCombat: ObjectInterface,
    sanctuarySante: ObjectInterface,
    startingPoint: ObjectInterface,
): ObjectInterface | null {
    const selectedType = selectedObject?.objectType;
    if (!selectedType) return null;

    if (selectedType === ObjectType.FLAG) return flag;
    if (selectedType === ObjectType.COMBAT_SANCTUARY) return sanctuaryCombat;
    if (selectedType === ObjectType.HEAL_SANCTUARY) return sanctuarySante;
    if (selectedType === ObjectType.START_POINT) return startingPoint;
    return null;
}

export function areMapsEqual(mapA: GameMap, mapB: GameMap): boolean {
    return JSON.stringify(mapA) === JSON.stringify(mapB);
}

function isBlockingTile(tileType: TileType): boolean {
    return tileType === TileType.WALL || tileType === TileType.DOOR_OPEN || tileType === TileType.DOOR_CLOSED;
}

export function canPlaceObject(
    selectedObject: ObjectInterface | null,
    actualObject: ObjectInterface | undefined,
    tileGrid: TileInterface,
): boolean {
    return !!(
        selectedObject &&
        selectedObject.quantity !== 0 &&
        selectedObject.objectType !== actualObject?.objectType &&
        !isBlockingTile(tileGrid.tileType)
    );
}

export function verifyObjectExist(cell: CellInterface): boolean {
    return cell.objects?.objectType !== ObjectType.DEFAULT;
}

export function isSanctuary(object: ObjectInterface | null | undefined): boolean {
    return object?.objectType === ObjectType.COMBAT_SANCTUARY || object?.objectType === ObjectType.HEAL_SANCTUARY;
}

export function getSanctuaryFootprint(anchorX: number, anchorY: number): { x: number; y: number }[] {
    return [
        { x: anchorX, y: anchorY },
        { x: anchorX + 1, y: anchorY },
        { x: anchorX, y: anchorY + 1 },
        { x: anchorX + 1, y: anchorY + 1 },
    ];
}

export function getSanctuaryImageParts(objectType: ObjectType): SanctuaryImageParts {
    if (objectType === ObjectType.COMBAT_SANCTUARY) {
        return {
            topLeft: './assets/sanctuary-combat-top-left.png',
            topRight: './assets/sanctuary-combat-top-right.png',
            bottomLeft: './assets/sanctuary-combat-bottom-left.png',
            bottomRight: './assets/sanctuary-combat-bottom-right.png',
        };
    }
    return {
        topLeft: './assets/sanctuary-health-top-left.png',
        topRight: './assets/sanctuary-health-top-right.png',
        bottomLeft: './assets/sanctuary-health-bottom-left.png',
        bottomRight: './assets/sanctuary-health-bottom-right.png',
    };
}

export function canPlaceSanctuaryAt(anchorX: number, anchorY: number, grid: CellInterface[][]): boolean {
    return getSanctuaryFootprint(anchorX, anchorY).every(({ x, y }) => {
        const cell = grid[x]?.[y];
        return cell && cell.tile.tileType !== TileType.WALL && cell.objects?.objectType === ObjectType.DEFAULT;
    });
}
