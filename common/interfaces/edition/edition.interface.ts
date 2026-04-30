import { ObjectInterface } from "../game-frontend/game-grid-interface";



export interface GridObjectLimits {
    sanctuaryTotal: number;
    startingPoint: number;
}


export interface GridObjectCounts {
    numberFlag: number;
    numberSanctuaryTotal: number;
    numberStartingPoint: number;
}



export interface TilePlacementResult {
    placed: boolean;
    requiresSanctuaryOverwrite: boolean;
    removedObject?: ObjectInterface;
}

export interface SanctuaryPlacementResult {
    placed: boolean;
    hasError: boolean;
}

export interface ObjectPlacementResult {
    placed: boolean;
    replacedObject?: ObjectInterface;
    blockedByTile?: boolean;
}