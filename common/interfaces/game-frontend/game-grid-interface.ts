import { ObjectType, SanctuaryPart, TileType } from '@common/enum/game/grid/game-grid.enum';
import { Position } from '../match/match-interface';

export interface CellInterface {
    objects?: ObjectInterface;
    tile: TileInterface;
}

export interface TileInterface {
    tileType: TileType;
    imageSrc: string;
    description?: string;
}


export interface ObjectInterface {
    objectType: ObjectType;
    nbCells: number;
    imageSrc: string;
    quantity?: number;
    description?: string;
    objectId?: string;
    anchorX?: number;
    anchorY?: number;
    isAnchor?: boolean;
    sanctuaryPart?: SanctuaryPart;
    isActive?: boolean;
}

export interface CellRightClickPayload {
    event: MouseEvent;
    position: Position;
    cellInfo: CellInterface;
    playerId: string | null;
}