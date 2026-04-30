/* eslint-disable max-lines-per-function -- On désactive cette règle parce que ce fichier de test regroupe plusieurs cas de validation du drapeau dans un bloc plus long que la limite autorisée. */

import { GameValidationError } from '@app/constants/game-validation.constants';
import { validateFlag } from '@app/services/game/validation/rules/flag/game-flag-validation.rules';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { createBaseGame, placeObject, setTile } from '@test/game-test-helpers';

describe('GameFlagValidationRules', () => {

    // =========================================================
    // SECTION 1 : MODE CAPTURE THE FLAG (CTF)
    // Le drapeau est OBLIGATOIRE et doit être UNIQUE et BIEN PLACÉ.
    // =========================================================

    // Scénario 1 : Succès (1 seul drapeau, position valide)
    it('devrait accepter une carte CTF avec exactement un drapeau placé sur un terrain valide', () => {
        // 1. ARRANGE
        const game = createBaseGame('CTF_Success', GameMode.CTF);
        const positionX = 5;
        const positionY = 5;
        // On place un drapeau sur une case d'herbe (par défaut) en (5,5)
        placeObject(game, positionX, positionY, ObjectType.FLAG);

        // 2. ACT
        // Note: On passe la grille brute (CellDto[][]) et le mode
        const result = validateFlag(game.grid.grid, game.mode);

        // 3. ASSERT
        expect(result).toBeUndefined(); // Pas d'erreur
    });

    // Scénario 2 : Échec (0 drapeau)
    it('devrait rejeter une carte CTF sans drapeau', () => {
        // 1. ARRANGE
        const game = createBaseGame('CTF_Missing', GameMode.CTF);
        // On ne place AUCUN objet

        // 2. ACT
        const result = validateFlag(game.grid.grid, game.mode);

        // 3. ASSERT
        expect(result).toBe(GameValidationError.MissingFlag);
    });

    // Scénario 3 : Échec (Trop de drapeaux)
    it('devrait rejeter une carte CTF avec plus d\'un drapeau', () => {
        // 1. ARRANGE
        const game = createBaseGame('CTF_TooMany', GameMode.CTF);
        const firstFlagX = 1;
        const firstFlagY = 1;
        const secondFlagX = 5;
        const secondFlagY = 5;

        placeObject(game, firstFlagX, firstFlagY, ObjectType.FLAG); // Drapeau 1
        placeObject(game, secondFlagX, secondFlagY, ObjectType.FLAG); // Drapeau 2

        // 2. ACT
        const result = validateFlag(game.grid.grid, game.mode);

        // 3. ASSERT
        expect(result).toBe(GameValidationError.TooMuchFlags);
    });

    // Scénario 4 : Échec (Mauvais placement - Sur un mur)
    it('devrait rejeter un drapeau placé sur un mur', () => {
        // 1. ARRANGE
        const game = createBaseGame('CTF_InvalidPos', GameMode.CTF);
        const x = 5;
        const y = 5;

        // On transforme la case en MUR
        setTile(game, x, y, TileType.WALL);
        // On tente de poser le drapeau dessus
        placeObject(game, x, y, ObjectType.FLAG);

        // 2. ACT
        const result = validateFlag(game.grid.grid, game.mode);

        // 3. ASSERT
        expect(result).toBe(GameValidationError.InvalidFlagPlacement);
    });

    // Scénario 5 : Succès (0 drapeau)
    it('devrait accepter une carte Classique sans aucun drapeau', () => {
        // 1. ARRANGE
        const game = createBaseGame('Classic_Success', GameMode.CLASSIC);
        // Aucun drapeau n'est ajouté

        // 2. ACT
        const result = validateFlag(game.grid.grid, game.mode);

        // 3. ASSERT
        expect(result).toBeUndefined(); // Valide
    });

    // Scénario 6 : Échec (Drapeau présent alors qu'interdit)
    it('devrait rejeter une carte Classique contenant un drapeau', () => {
        // 1. ARRANGE
        const game = createBaseGame('Classic_Fail', GameMode.CLASSIC);
        const flagX = 5;
        const flagY = 5;
        // On ajoute un drapeau (ce qui est interdit en classique)
        placeObject(game, flagX, flagY, ObjectType.FLAG);

        // 2. ACT
        const result = validateFlag(game.grid.grid, game.mode);

        // 3. ASSERT
        expect(result).toBe(GameValidationError.NonApplicableFlag);
    });
});