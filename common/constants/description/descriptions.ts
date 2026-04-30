import { ObjectType, TileType } from '../../interfaces/game-frontend/game-grid-interface';


export const TILE_DESCRIPTIONS: Record<TileType, string> = {
    [TileType.DEFAULT]: "Terrain standard. Aucun effet particulier.",
    [TileType.WALL]: "Un mur infranchissable. Impossible de s'y déplacer.",
    [TileType.WATER]: "Eau profonde. Coût de déplacement : +2.",
    [TileType.DOOR_OPEN]: "Une porte ouverte. Coût de déplacement : 1.",
    [TileType.DOOR_CLOSED]: "Une porte fermée. Peut être ouverte avec une action.",
    [TileType.ICE]: "Glace. Le sol est glissant ! Coût de déplacement : 0 (gratuit).",
};

export const OBJECT_DESCRIPTIONS: Record<ObjectType, string> = {
    [ObjectType.START_POINT]: "Point de départ des joueurs.",
    [ObjectType.FLAG]: "Le Drapeau ! Capturez-le pour gagner.",
    [ObjectType.SANCTUARY_COMBAT]: "Sanctuaire de combat : Protège temporairement.",
    [ObjectType.SANCTUARY_SANTE]: "Sanctuaire de santé : Soigne temporairement.",
    [ObjectType.DEFAULT]: "Aucun objet.",
};