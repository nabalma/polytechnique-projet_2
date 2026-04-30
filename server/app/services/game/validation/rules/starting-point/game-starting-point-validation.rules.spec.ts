/* eslint-disable max-lines-per-function -- On désactive cette règle parce que ce fichier de test regroupe plusieurs cas de validation des points de départ dans un bloc plus long que la limite autorisée. */

import {
    GameValidationError,
    STARTING_POINTS_BY_GRID_SIZE,
} from '@app/constants/game-validation.constants';
import { validateStartingPoints } from '@app/services/game/validation/rules/starting-point/game-starting-point-validation.rules';
import { GridSize, ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { createBaseGame, placeObject, setTile } from '@test/game-test-helpers';

describe('GameStartingPointsRules', () => {

    // Constantes pour la lisibilité (correspondent à tes tailles d'enum)
    const SIZE_SMALL = 10;
    const SIZE_MEDIUM = 15;
    const SIZE_LARGE = 20;

    const NO_ERRORS = 0;
    const TEST_X = 5;
    const TEST_Y = 5;
    const INVALID_GRID_SIZE = 999;

    // =========================================================
    // 1. Tests des Tailles (Couvre le Switch Case ligne 69)
    // =========================================================

    it(`devrait valider une grille SMALL (${SIZE_SMALL}x${SIZE_SMALL}) avec ${STARTING_POINTS_BY_GRID_SIZE[GridSize.SMALL]} points`, () => {
        // ARRANGE
        const game = createBaseGame('Small_Success', GameMode.CLASSIC, SIZE_SMALL);

        // On place le nombre exact requis pour SMALL
        for (let i = 0; i < STARTING_POINTS_BY_GRID_SIZE[GridSize.SMALL]; i++) {
            placeObject(game, i, 0, ObjectType.START_POINT);
        }

        // ACT & ASSERT
        const errors = validateStartingPoints(game.grid);
        expect(errors.length).toBe(NO_ERRORS);
    });

    it(`devrait valider une grille MEDIUM (${SIZE_MEDIUM}x${SIZE_MEDIUM}) avec ${STARTING_POINTS_BY_GRID_SIZE[GridSize.MEDIUM]} points`, () => {
        // ARRANGE
        const game = createBaseGame('Medium_Success', GameMode.CLASSIC, SIZE_MEDIUM);

        for (let i = 0; i < STARTING_POINTS_BY_GRID_SIZE[GridSize.MEDIUM]; i++) {
            placeObject(game, i, 0, ObjectType.START_POINT);
        }

        // ACT & ASSERT
        const errors = validateStartingPoints(game.grid);
        expect(errors.length).toBe(NO_ERRORS);
    });

    // 🎯 C'est ce test qui va couvrir ta ligne 69 !
    it(`devrait valider une grille LARGE (${SIZE_LARGE}x${SIZE_LARGE}) avec ${STARTING_POINTS_BY_GRID_SIZE[GridSize.LARGE]} points`, () => {
        // ARRANGE
        const game = createBaseGame('Large_Success', GameMode.CLASSIC, SIZE_LARGE); // Taille 20

        for (let i = 0; i < STARTING_POINTS_BY_GRID_SIZE[GridSize.LARGE]; i++) {
            placeObject(game, i, 0, ObjectType.START_POINT);
        }

        // ACT & ASSERT
        const errors = validateStartingPoints(game.grid);
        expect(errors.length).toBe(NO_ERRORS);
    });

    // =========================================================
    // 2. Tests de Quantité Incorrecte
    // =========================================================

    it('devrait rejeter une carte avec PAS ASSEZ de points', () => {
        const game = createBaseGame('TooFew', GameMode.CLASSIC, SIZE_SMALL);
        // On place (Requis - 1)
        const count = STARTING_POINTS_BY_GRID_SIZE[GridSize.SMALL] - 1;
        for (let i = 0; i < count; i++) placeObject(game, i, 0, ObjectType.START_POINT);

        const errors = validateStartingPoints(game.grid);
        expect(errors).toContain(GameValidationError.InvalidStartingPointsCount);
    });

    it('devrait rejeter une carte avec TROP de points', () => {
        const game = createBaseGame('TooMany', GameMode.CLASSIC, SIZE_SMALL);
        // On place (Requis + 1)
        const count = STARTING_POINTS_BY_GRID_SIZE[GridSize.SMALL] + 1;
        for (let i = 0; i < count; i++) placeObject(game, i, 0, ObjectType.START_POINT);

        const errors = validateStartingPoints(game.grid);
        expect(errors).toContain(GameValidationError.InvalidStartingPointsCount);
    });

    // =========================================================
    // 3. Tests de Placement (Terrain)
    // =========================================================

    it('devrait rejeter un point de départ placé sur un MUR', () => {
        const game = createBaseGame('Bad_Terrain', GameMode.CLASSIC, SIZE_SMALL);

        // On place un MUR et on pose le point dessus
        setTile(game, TEST_X, TEST_Y, TileType.WALL);
        placeObject(game, TEST_X, TEST_Y, ObjectType.START_POINT);

        // On complète avec d'autres points valides pour le quota
        for (let i = 1; i < STARTING_POINTS_BY_GRID_SIZE[GridSize.SMALL]; i++) {
            placeObject(game, i, 0, ObjectType.START_POINT);
        }

        const errors = validateStartingPoints(game.grid);
        expect(errors).toContain(GameValidationError.InvalidStartingPointsPlacement);
    });

    // =========================================================
    // 4. Tests d'Accessibilité (Isolé)
    // =========================================================

    it('devrait rejeter un point de départ enfermé par des murs', () => {
        const game = createBaseGame('Isolated', GameMode.CLASSIC, SIZE_SMALL);

        // Point isolé en (5,5)
        placeObject(game, TEST_X, TEST_Y, ObjectType.START_POINT);
        setTile(game, TEST_X + 1, TEST_Y, TileType.WALL);
        setTile(game, TEST_X - 1, TEST_Y, TileType.WALL);
        setTile(game, TEST_X, TEST_Y + 1, TileType.WALL);
        setTile(game, TEST_X, TEST_Y - 1, TileType.WALL);

        // Complément pour le quota
        for (let i = 1; i < STARTING_POINTS_BY_GRID_SIZE[GridSize.SMALL]; i++) {
            placeObject(game, i, 0, ObjectType.START_POINT);
        }

        const errors = validateStartingPoints(game.grid);
        expect(errors).toContain(GameValidationError.InaccessibleTileForStartingPoint);
    });

    // =========================================================
    // 5. Test Défensif (Switch Default)
    // =========================================================

    it('devrait retourner une erreur de count si la taille de grille est invalide (lookup retourne undefined)', () => {
        const game = createBaseGame('Invalid_Size', GameMode.CLASSIC, SIZE_SMALL);

        // On force une taille inconnue : le lookup retourne undefined,
        // donc le count ne correspondra jamais → erreur InvalidStartingPointsCount
        game.grid.gridSize = INVALID_GRID_SIZE as unknown as GridSize;

        const errors = validateStartingPoints(game.grid);
        expect(errors).toContain(GameValidationError.InvalidStartingPointsCount);
    });

    // =========================================================
    // 6. Test Erreurs Multiples
    // =========================================================

    it('devrait retourner plusieurs erreurs simultanément', () => {
        const game = createBaseGame('Multi_Errors', GameMode.CLASSIC, SIZE_SMALL);

        // 1. Erreur de Nombre (0 points au lieu de 2)
        // 2. Erreur d'Accessibilité (non applicable car pas de point, mais le code count échoue)

        // Pour tester multiple erreurs, on va mettre un point sur un mur (Placement)
        // ET on en mettra pas assez (Nombre)

        setTile(game, 0, 0, TileType.WALL);
        placeObject(game, 0, 0, ObjectType.START_POINT);
        // Total points = 1 (Il en faut 2 pour Small) -> Erreur Count
        // Placé sur Mur -> Erreur Placement

        const errors = validateStartingPoints(game.grid);

        expect(errors).toContain(GameValidationError.InvalidStartingPointsCount);
        expect(errors).toContain(GameValidationError.InvalidStartingPointsPlacement);
    });

});