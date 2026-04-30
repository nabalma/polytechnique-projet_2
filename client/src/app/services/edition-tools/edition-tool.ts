import { Injectable } from '@angular/core';
import { DOOR_CLOSED_IMAGE_SRC, DOOR_OPEN_IMAGE_SRC } from '@common/constants/game-grid/game-grid.constants';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { ObjectInterface, TileInterface } from '@common/interfaces/game-frontend/game-grid-interface';


@Injectable({
    providedIn: 'root',
})
export class EditionTool {
    createDefaultTile(): TileInterface {
        const defaultTile: TileInterface = {
            tileType: TileType.DEFAULT,
            imageSrc: 'assets/default-tile.jpeg',
            description: 'Terrain standard. Aucun effet particulier.',
        };

        return defaultTile;
    }

    createDoorTileOpen(): TileInterface {
        const doorTile: TileInterface = {
            tileType: TileType.DOOR_OPEN,
            imageSrc: DOOR_OPEN_IMAGE_SRC,
            description: 'Une porte ouverte. Coût de déplacement : 1',
        };

        return doorTile;
    }

    createDoorTileClosed(): TileInterface {
        const doorTile: TileInterface = {
            tileType: TileType.DOOR_CLOSED,
            imageSrc: DOOR_CLOSED_IMAGE_SRC,
            description: 'Une porte fermée. impossible de s\'y deplacer.',
        };

        return doorTile;
    }

    createIceTile(): TileInterface {
        const iceTile: TileInterface = {
            tileType: TileType.ICE,
            imageSrc: 'assets/ice.jpeg',
            description: 'Glace. Le sol est glissant ! Coût de déplacement : 0 (gratuit).',
        };

        return iceTile;
    }

    createWaterTile(): TileInterface {
        const waterTile: TileInterface = {
            tileType: TileType.WATER,
            imageSrc: 'assets/water.jpeg',
            description: 'Eau profonde. Coût de déplacement : +2.',
        };

        return waterTile;
    }

    createWallTile(): TileInterface {
        const wallTile: TileInterface = {
            tileType: TileType.WALL,
            imageSrc: 'assets/wall.jpeg',
            description: "Un mur infranchissable. Impossible de s'y déplacer.",
        };

        return wallTile;
    }

    createDefaultObject(): ObjectInterface {
        const defaultObject: ObjectInterface = { nbCells: 1, objectType: ObjectType.DEFAULT, imageSrc: ' ', quantity: 0 };

        return defaultObject;
    }

    createFlagObject(numberOfInstance: number): ObjectInterface {
        const flagObject: ObjectInterface = {
            objectType: ObjectType.FLAG,
            nbCells: 1,
            imageSrc: 'assets/flag.jpeg',
            quantity: numberOfInstance,
            description: 'Le Drapeau ! Capturez-le pour gagner.',
        };
        return flagObject;
    }

    createSanctuaryObjectCombat(numberOfInstance: number): ObjectInterface {
        const sanctuaryObjectCombat = {
            nbCells: 4,
            objectType: ObjectType.COMBAT_SANCTUARY,
            imageSrc: 'assets/sanctuary-combat.jpeg',
            quantity: numberOfInstance,
            description: 'Sanctuaire : Protège temporairement.',
        };

        return sanctuaryObjectCombat;
    }

    createSanctuaryObjectSante(numberOfInstance: number): ObjectInterface {
        const sanctuaryObjectSante = {
            nbCells: 4,
            objectType: ObjectType.HEAL_SANCTUARY,
            imageSrc: 'assets/sanctuary-health.png',
            quantity: numberOfInstance,
            description: 'Sanctuaire : Soigne Temporairement.',
        };

        return sanctuaryObjectSante;
    }

    createStartingPointObject(numberOfInstance: number): ObjectInterface {
        const startingPoint: ObjectInterface = {
            objectType: ObjectType.START_POINT,
            nbCells: 1,
            quantity: numberOfInstance,
            imageSrc: 'assets/starting-point.jpeg',
            description: 'Point de départ des joueurs.',
        };

        return startingPoint;
    }
}
