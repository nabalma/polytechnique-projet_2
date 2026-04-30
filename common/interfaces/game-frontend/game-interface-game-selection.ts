import { GridSize } from "@common/enum/game/grid/game-grid.enum";
import { GameMode } from "@common/enum/game/mode/game-mode.enum";


export interface GameInterfaceGameSelection {
    imageUrl: string,
    name: string,
    gridSize: GridSize,
    mode: GameMode,
    _id: string,
    description: string,
}