/* eslint-disable max-lines-per-function -- On désactive cette règle parce que ce fichier de test regroupe plusieurs vérifications du validateur dans un bloc plus long que la limite autorisée. */

import { GameValidationError } from '@app/constants/game-validation.constants';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createBaseGame, placeObject, setTile } from '@test/game-test-helpers';
import { GameValidatorService } from './game-validator.service';

describe('GameValidatorService', () => {
    let service: GameValidatorService;
    const GRID_SIZE = 10;
    const TEST_TILE_POSITION = 5;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GameValidatorService],
        }).compile();

        service = module.get<GameValidatorService>(GameValidatorService);
    });

    it('devrait être défini', () => {
        expect(service).toBeDefined();
    });

    // 1. Test du CAS PASSANT (Happy Path)
    it('devrait valider un game correct sans lancer d\'exception', () => {
        // ARRANGE
        // On crée un game valide (Mode Classic, Taille 10 => besoin de 2 points de départ)
        const game = createBaseGame('ValidGame', GameMode.CLASSIC, GRID_SIZE);
        placeObject(game, 0, 0, ObjectType.START_POINT);
        placeObject(game, 1, 0, ObjectType.START_POINT);

        // (Le terrain est par défaut valide car rempli d'herbe)

        // ACT & ASSERT
        // On s'attend à ce que la fonction ne fasse RIEN (pas d'erreur levée)
        expect(() => service.validate(game)).not.toThrow();
    });

    // 2. Test de l'EXCEPTION (Erreur simple)
    it('devrait lancer BadRequestException si une règle est violée', () => {
        // ARRANGE
        // On crée un game invalide (0 points de départ alors qu'il en faut 2)
        const game = createBaseGame('InvalidGame', GameMode.CLASSIC, GRID_SIZE);

        // ACT & ASSERT
        try {
            service.validate(game);
            fail('Le service aurait dû lancer une exception'); // Sécurité si l'erreur n'est pas lancée
        } catch (error) {
            // 1. Vérifier le type d'erreur (Code 400)
            expect(error).toBeInstanceOf(BadRequestException);

            // 2. Vérifier le contenu
            const response = error.getResponse();
            expect(response['message']).toBe('Le game est invalide');
            // On vérifie que la bonne erreur est dans la liste
            expect(response['error']).toContain(GameValidationError.InvalidStartingPointsCount);
        }
    });

    // 3. Test de l'AGRÉGATION (Spread Operator ...)
    // C'est le test le plus important pour ta structure !
    // Il vérifie que le spread operator `...` fonctionne bien avec les tableaux
    it('devrait combiner les erreurs simples et les tableaux d\'erreurs', () => {
        // ARRANGE
        const game = createBaseGame('MultiError', GameMode.CLASSIC, GRID_SIZE);

        // Erreur 1 : Porte invalide (Simple return)
        // On met une porte isolée (sans murs)
        setTile(game, TEST_TILE_POSITION, TEST_TILE_POSITION, TileType.DOOR_OPEN);

        // Erreur 2 : Pas assez de points de départ (Return Array via validateStartingPoints)
        // (On ne met aucun point de départ)

        // ACT
        try {
            service.validate(game);
        } catch (error) {
            const errors = error.getResponse()['error'];

            // ASSERT
            // On doit retrouver les deux types d'erreurs dans la même liste à plat
            expect(errors).toContain(GameValidationError.InvalidDoorPlacement);      // Venant de validateDoors
            expect(errors).toContain(GameValidationError.InvalidStartingPointsCount); // Venant de ...validateStartingPoints

            // Vérification du filtrage (pas de null/undefined)
            expect(errors).not.toContain(undefined);
            expect(errors).not.toContain(null);
        }
    });
});