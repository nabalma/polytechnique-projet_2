/* eslint-disable max-lines-per-function -- On désactive cette règle parce que ce fichier de test regroupe plusieurs cas de validation du ratio des terrains dans un bloc plus long que la limite autorisée. */

import { GameValidationError } from '@app/constants/game-validation.constants';
import { hasSufficientTerrainRatio } from '@app/services/game/validation/rules/map-terrain/game-map-terrain-ratio-validation.rules';
import { TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { createBaseGame, setTile } from '@test/game-test-helpers';

describe('GameTerrainRatioRules', () => {

    // Scénario 1 : Succès - Carte 100% Terrain (Vide)
    it('devrait accepter une carte par défaut (100% terrain)', () => {
        // ARRANGE
        // createBaseGame crée une grille 10x10 par défaut
        const game = createBaseGame('Ratio_Success', GameMode.CLASSIC);

        // ACT
        const result = hasSufficientTerrainRatio(game.grid);

        // ASSERT
        expect(result).toBeUndefined();
    });

    // Scénario 2 : Échec - Limite Exacte (50% Terrain / 50% Murs)
    // Avec ta condition "<=", avoir exactement 50% est une erreur.
    it('devrait rejeter une carte ayant exactement le ratio minimum (50%)', () => {
        // ARRANGE
        const game = createBaseGame('Ratio_Limit_Fail', GameMode.CLASSIC); // 10x10 = 100 cases
        const halfGridSize = game.grid.gridSize / 2;

        // On doit placer 50 murs pour qu'il reste 50 terrains.
        // On remplit les 5 premières lignes entièrement (5 * 10 = 50 cases)
        for (let y = 0; y < halfGridSize; y++) {
            for (let x = 0; x < game.grid.gridSize; x++) {
                setTile(game, x, y, TileType.WALL);
            }
        }

        // ACT
        const result = hasSufficientTerrainRatio(game.grid);

        // ASSERT
        expect(result).toBe(GameValidationError.InsufficientTerrainRatio);
    });

    // Scénario 3 : Succès - Juste au-dessus de la limite (51% Terrain)
    it('devrait accepter une carte ayant juste assez de terrain (51%)', () => {
        // ARRANGE
        const game = createBaseGame('Ratio_Limit_Success', GameMode.CLASSIC); // 10x10

        // On veut 51 terrains, donc on doit mettre 49 Murs.
        // On remplit 4 lignes complètes (40 murs) + 9 murs sur la ligne suivante.
        const TOTAL_TILES = game.grid.gridSize * game.grid.gridSize;
        const TARGET_TERRAIN_RATIO = 0.51;
        const DESIRED_TERRAIN_TILES = Math.ceil(TOTAL_TILES * TARGET_TERRAIN_RATIO);
        const WALLS_TO_PLACE = TOTAL_TILES - DESIRED_TERRAIN_TILES;

        let wallCount = 0;
        for (let y = 0; y < game.grid.gridSize; y++) {
            for (let x = 0; x < game.grid.gridSize; x++) {
                if (wallCount < WALLS_TO_PLACE) {
                    setTile(game, x, y, TileType.WALL);
                    wallCount++;
                }
            }
        }

        // Vérification mathématique : 100 cases - 49 murs = 51 terrains.
        // Ratio = 0.51 > 0.5

        // ACT
        const result = hasSufficientTerrainRatio(game.grid);

        // ASSERT
        expect(result).toBeUndefined();
    });
});