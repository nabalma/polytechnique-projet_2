import { GameValidationError } from '@app/constants/game-validation.constants';
import { GridDto } from '@app/model/dto/game/grid.dto';
import { isAccessibleTile, runGridBfs } from '@app/services/game/validation/rules/grid/grid-utils';


export function areAllAccessibleTilesReachable(
  grid: GridDto): GameValidationError {

  const visited = runGridBfs(grid);

  for (let y = 0; y < grid.grid.length; y++) {
    for (let x = 0; x < grid.grid[y].length; x++) {
      if (
        isAccessibleTile(grid.grid[y][x]) &&
        !visited.has(`${x},${y}`)
      ) {
        return GameValidationError.InaccessibleTile;
      }
    }
  }
  return;
}
