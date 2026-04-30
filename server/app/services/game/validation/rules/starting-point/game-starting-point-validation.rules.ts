import {
  GameValidationError,
  STARTING_POINTS_BY_GRID_SIZE,
  TERRAIN_TILES,
} from '@app/constants/game-validation.constants';
import { CellDto } from '@app/model/dto/game/cell.dto';
import { GridDto } from '@app/model/dto/game/grid.dto';
import { flattenGrid, getNeighbors } from '@app/services/game/validation/rules/grid/grid-utils';
import { GridSize, ObjectType } from '@common/enum/game/grid/game-grid.enum';


export function validateStartingPoints(grid: GridDto): GameValidationError[] {

  const errors: GameValidationError[] = [];

  if (!validateStartingPointsCount(grid)) {
    errors.push(GameValidationError.InvalidStartingPointsCount);
  }

  if (!startingPointIsPlacedOnTerrainTile(grid)) {
    errors.push(GameValidationError.InvalidStartingPointsPlacement);
  }


  if (!areStartingPointsAccessible(grid)) {
    errors.push(GameValidationError.InaccessibleTileForStartingPoint);
  }
  return errors;
}

export function getRequiredStartingPoints(gridSize: GridSize): number {
  return STARTING_POINTS_BY_GRID_SIZE[gridSize];
}

/*Tous les points de départ requis doivent être placés.
Aucun point de départ requis ne peut être manquant.
La carte est invalide si au moins un point requis n’est pas présent.
*/
function validateStartingPointsCount(grid: GridDto): boolean {
  const cells = grid.grid.flat();

  const startingPointsCount = cells.filter(
    cell => cell.objects?.objectType === ObjectType.START_POINT,
  ).length;

  const required = getRequiredStartingPoints(grid.gridSize);

  return startingPointsCount === required;


}


function startingPointIsPlacedOnTerrainTile(grid: GridDto): boolean {
  const cells: CellDto[] = flattenGrid(grid.grid);
  for (const cell of cells) {
    if (cell.objects?.objectType === ObjectType.START_POINT) {
      if (!TERRAIN_TILES.includes(cell.tile.tileType)) {
        return false;
      }
    }
  }

  return true;
}


function areStartingPointsAccessible(grid: GridDto): boolean {
  for (let y = 0; y < grid.grid.length; y++) {
    for (let x = 0; x < grid.grid[y].length; x++) {
      const cell = grid.grid[y][x];

      if (cell.objects?.objectType === ObjectType.START_POINT) {
        const hasAccessibleNeighbor = getNeighbors(x, y, grid).length > 0;

        if (!hasAccessibleNeighbor) {
          return false;
        }
      }
    }
  }
  return true;
}


