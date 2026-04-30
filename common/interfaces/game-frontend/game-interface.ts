import { GridSize } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { CellInterface } from './game-grid-interface';



export interface GameInterface {
    _id?: string;
    name: string;
    mode: GameMode;
    grid: GameMap;
    description: string;
    isVisible: boolean;
    imageUrl: string;
    createdAt: Date;
    updateAt: Date;
}

export interface GameMap {
    id?: number;
    gridSize: GridSize;
    grid: CellInterface[][];
}

export interface CoordinateGrid {
    x: number;
    y: number;
}

export interface GameCreationConfig {
    mode: GameMode;
    size: GridSize;
}

