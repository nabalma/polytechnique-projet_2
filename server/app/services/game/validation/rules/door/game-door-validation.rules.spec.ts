/* eslint-disable max-lines-per-function -- On désactive cette règle parce que ce fichier de test regroupe plusieurs cas de validation des portes dans un bloc plus long que la limite autorisée. */

import { GameValidationError } from '@app/constants/game-validation.constants';
import { validateDoors } from '@app/services/game/validation/rules/door/game-door-validation.rules';
import { TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';

import { createBaseGame, setTile } from '@test/game-test-helpers';

describe('GameDoorValidationRules', () => {
    it('devrait accepter une porte placée horizontalement (Mur-Porte-Mur)', () => {
        const game = createBaseGame('DoorTest', GameMode.CLASSIC);
        const positionX = 5;
        const positionY = 5;
        setTile(game, positionX, positionY, TileType.DOOR_CLOSED);
        setTile(game, positionX + 1, positionY, TileType.WALL);
        setTile(game, positionX - 1, positionY, TileType.WALL);
        const result = validateDoors(game.grid);
        expect(result).toBeUndefined();
    });

    it('devrait accepter une porte placée verticalement (Mur en Haut/Bas)', () => {
        const game = createBaseGame('DoorTestVertical', GameMode.CLASSIC);
        const x = 5;
        const y = 5;
        setTile(game, x, y, TileType.DOOR_CLOSED);
        setTile(game, x, y - 1, TileType.WALL);
        setTile(game, x, y + 1, TileType.WALL);
        const result = validateDoors(game.grid);
        expect(result).toBeUndefined();
    });

    it('devrait rejeter une porte isolée (entourée uniquement de terrain)', () => {
        const game = createBaseGame('DoorFailTerrain', GameMode.CLASSIC);
        const x = 5;
        const y = 5;
        setTile(game, x, y, TileType.DOOR_CLOSED);
        const result = validateDoors(game.grid);
        expect(result).toBe(GameValidationError.InvalidDoorPlacement);
    });

    it('devrait rejeter une porte bloquée (entourée de murs sur les 4 côtés)', () => {
        const game = createBaseGame('DoorFailBlocked', GameMode.CLASSIC);
        const x = 5;
        const y = 5;
        setTile(game, x, y, TileType.DOOR_CLOSED);
        setTile(game, x - 1, y, TileType.WALL);
        setTile(game, x + 1, y, TileType.WALL);
        setTile(game, x, y - 1, TileType.WALL);
        setTile(game, x, y + 1, TileType.WALL);
        const result = validateDoors(game.grid);
        expect(result).toBe(GameValidationError.InvalidDoorPlacement);
    });

    it('devrait rejeter une porte avec un seul mur (configuration incomplète)', () => {
        const game = createBaseGame('DoorFailIncomplete', GameMode.CLASSIC);
        const x = 5;
        const y = 5;
        setTile(game, x, y, TileType.DOOR_CLOSED);
        setTile(game, x - 1, y, TileType.WALL);
        const result = validateDoors(game.grid);
        expect(result).toBe(GameValidationError.InvalidDoorPlacement);
    });

    it('devrait gérer une porte collée au bord de la carte (0, 5)', () => {
        const game = createBaseGame('DoorEdge', GameMode.CLASSIC);
        const position1 = { x: 0, y: 5 };
        const position2 = { x: 1, y: 5 };
        setTile(game, position1.x, position1.y, TileType.DOOR_CLOSED);
        setTile(game, position2.x, position2.y, TileType.WALL);
        const result = validateDoors(game.grid);
        expect(result).toBe(GameValidationError.InvalidDoorPlacement);
    });
});