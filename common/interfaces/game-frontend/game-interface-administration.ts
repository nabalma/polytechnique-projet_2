import { GridSize } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';

export interface GameInterfaceAdministration {
    name: string,
    gridSize: GridSize,
    imageUrl: string,
    isVisible: boolean,
    mode: GameMode,
    description: string,
    createdAt: Date,
    updateAt: Date,
    _id: string,
}