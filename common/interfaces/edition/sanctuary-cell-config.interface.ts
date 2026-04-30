import { SanctuaryPart } from '@common/enum/game/grid/game-grid.enum';
import { ObjectInterface } from '@common/interfaces/game-frontend/game-grid-interface';

export interface SanctuaryCellConfig {
    objectToPlace: ObjectInterface;
    imageSrc: string;
    objectId: string;
    anchorX: number;
    anchorY: number;
    isAnchor: boolean;
    sanctuaryPart: SanctuaryPart;
}

export interface SanctuaryImageParts {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
}

export interface SanctuaryGridBuildContext {
    objectToPlace: ObjectInterface;
    imageParts: SanctuaryImageParts;
    objectId: string;
    anchorX: number;
    anchorY: number;
}
