import { GridSize, ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
export { GameValidationError } from '@common/enum/game-backend/game-validation-errors';


export const STARTING_POINTS_BY_GRID_SIZE: Record<GridSize, number> = {
  [GridSize.SMALL]: 2,
  [GridSize.MEDIUM]: 4,
  [GridSize.LARGE]: 6,
};

export const MIN_TERRAIN_RATIO = 0.5;

export const FLAG_TYPE = ObjectType.FLAG;

export const BASE_TERRAIN_TILES: readonly TileType[] = [
  TileType.DEFAULT,
  TileType.WATER,
  TileType.ICE,
] as const;

export const FLAG_ALLOWED_TILES: readonly TileType[] =
  BASE_TERRAIN_TILES;

export const TERRAIN_TILES: readonly TileType[] =
  BASE_TERRAIN_TILES;

