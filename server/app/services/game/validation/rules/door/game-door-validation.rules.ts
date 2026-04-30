import { GameValidationError } from '@app/constants/game-validation.constants';
import { CellDto } from '@app/model/dto/game/cell.dto';
import { GridDto } from '@app/model/dto/game/grid.dto';
import { TileType } from '@common/enum/game/grid/game-grid.enum';

export function validateDoors(grid: GridDto): GameValidationError {

    for (let y = 0; y < grid.gridSize; y++) {
        for (let x = 0; x < grid.gridSize; x++) {
            const tileType = grid.grid[y][x].tile.tileType;
            const isDoor: boolean = tileType === TileType.DOOR_OPEN || tileType === TileType.DOOR_CLOSED;
            if (isDoor && !isValidDoorPlacement(grid.grid, y, x)) {
                return GameValidationError.InvalidDoorPlacement;
            }
        }
    }
}

function isValidDoorPlacement(grid: CellDto[][], y: number, x: number): boolean {
    const hasHorizontalWalls = isWallAt(grid, y, x - 1) && isWallAt(grid, y, x + 1);
    const hasVerticalTerrain = isTerrainAt(grid, y - 1, x) && isTerrainAt(grid, y + 1, x);
    const isValidHorizontal = hasHorizontalWalls && hasVerticalTerrain;

    const hasVerticalWalls = isWallAt(grid, y - 1, x) && isWallAt(grid, y + 1, x);
    const hasHorizontalTerrain = isTerrainAt(grid, y, x - 1) && isTerrainAt(grid, y, x + 1);
    const isValidVertical = hasVerticalWalls && hasHorizontalTerrain;

    return isValidHorizontal || isValidVertical;
}


/**
 * Vérifie si la tuile aux coordonnées (y, x) est un MUR.
 * Retourne false si les coordonnées sont hors de la grille.
 */
function isWallAt(grid: CellDto[][], y: number, x: number): boolean {
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) {
        return false;
    }
    return grid[y][x].tile.tileType === TileType.WALL;
}

/**
 * Vérifie si la tuile aux coordonnées (y, x) est un TERRAIN (Base, Eau, Glace).
 * Retourne false si les coordonnées sont hors de la grille.
 */
function isTerrainAt(grid: CellDto[][], y: number, x: number): boolean {
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) {
        return false;
    }
    const type = grid[y][x].tile.tileType;

    return type === TileType.DEFAULT || type === TileType.WATER || type === TileType.ICE;
}