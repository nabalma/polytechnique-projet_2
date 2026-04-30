/* eslint-disable max-lines-per-function -- On désactive cette règle parce que ce fichier de test regroupe plusieurs cas de validation de l’accessibilité de la carte dans un bloc plus long que la limite autorisée. */

import { GameValidationError } from '@app/constants/game-validation.constants';
import { areAllAccessibleTilesReachable } from '@app/services/game/validation/rules/map-accessibility/game-map-accessibility-validation.rules';
import { TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { createBaseGame, setTile } from '@test/game-test-helpers';

describe('GameReachabilityRules', () => {

    // Scénario 1 : Succès - Carte ouverte (Tout est accessible)
    it('devrait accepter une carte simple où tout est connecté', () => {
        // ARRANGE
        // createBaseGame crée une grille remplie de TileType.DEFAULT (Herbe)
        // Le BFS va commencer en (0,0) et tout parcourir.
        const game = createBaseGame('Reach_Success', GameMode.CLASSIC);

        // ACT
        const result = areAllAccessibleTilesReachable(game.grid);

        // ASSERT
        expect(result).toBeUndefined();
    });

    // Scénario 2 : Échec - Zone isolée (Une île inaccessible)
    it('devrait rejeter une carte contenant une zone isolée par des murs', () => {
        // ARRANGE
        const game = createBaseGame('Reach_Island', GameMode.CLASSIC);

        const WALL_COLUMN = 5; // A column index to create a vertical wall
        // On construit un mur vertical au milieu (colonne 5)
        // Le BFS va commencer à gauche (0,0), explorer la gauche, mais sera bloqué.
        for (let y = 0; y < game.grid.grid.length; y++) {
            setTile(game, WALL_COLUMN, y, TileType.WALL);
        }

        // Résultat : Les tuiles de la colonne 6 à 9 sont du terrain (DEFAULT) 
        // MAIS le BFS ne pourra jamais les atteindre.

        // ACT
        const result = areAllAccessibleTilesReachable(game.grid);

        // ASSERT
        expect(result).toBe(GameValidationError.InaccessibleTile);
    });

    // Scénario 3 : Échec - Coin fermé (Prison)
    it('devrait détecter une tuile de terrain enfermée dans un coin', () => {
        // ARRANGE
        const game = createBaseGame('Reach_Prison', GameMode.CLASSIC);

        // On isole le coin Haut-Gauche (0,0) avec des murs
        // ATTENTION : Ta fonction findFirstAccessibleCell cherche de haut en bas.
        // Si (0,0) est isolé, le BFS va commencer là, visiter (0,0), et s'arrêter.
        // Tout LE RESTE de la carte sera considéré comme non-visité !
        setTile(game, 0, 1, TileType.WALL); // Mur en dessous
        setTile(game, 1, 0, TileType.WALL); // Mur à droite
        setTile(game, 1, 1, TileType.WALL); // Mur en diagonale pour bien fermer

        // ACT
        const result = areAllAccessibleTilesReachable(game.grid);

        // ASSERT
        // Comme (0,0) est isolé du reste du monde, 99% de la carte est inaccessible depuis (0,0).
        expect(result).toBe(GameValidationError.InaccessibleTile);
    });

    // Scénario 4 : Succès - Les murs inaccessibles ne comptent pas
    it('ne devrait pas échouer si des murs sont inaccessibles', () => {
        // ARRANGE
        const game = createBaseGame('Reach_Walls', GameMode.CLASSIC);
        const maxIndex = game.grid.grid.length - 1;
        // On crée un mur totalement isolé au milieu de nulle part (entouré d'eau par exemple, ou juste un mur)
        // Ici, on remplit le coin (9,9) avec un MUR.
        // Même si le BFS ne va pas "sur" le mur, ta fonction isAccessibleTile(WALL) est false.
        // Donc la boucle de validation va ignorer ce mur.

        setTile(game, maxIndex, maxIndex, TileType.WALL);

        // ACT
        const result = areAllAccessibleTilesReachable(game.grid);

        // ASSERT
        expect(result).toBeUndefined();
    });

});