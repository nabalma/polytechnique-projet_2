import { GridDto } from '@app/model/dto/game/grid.dto';
import { GameValidationError, MIN_TERRAIN_RATIO, TERRAIN_TILES } from '@app/constants/game-validation.constants';
import { flattenGrid } from '@app/services/game/validation/rules/grid/grid-utils';

export function hasSufficientTerrainRatio(
  grid: GridDto): GameValidationError {

  const cells = flattenGrid(grid.grid);
  const terrainCount = cells.filter(cell =>
    TERRAIN_TILES.includes(cell.tile.tileType)).length;

  if (terrainCount / cells.length <= MIN_TERRAIN_RATIO) {
    return GameValidationError.InsufficientTerrainRatio;
  }

  return;
}
