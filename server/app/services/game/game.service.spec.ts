/**
 * Certains tests ont besoin d'avoir une certaines quantités pour rendre le test exhaustive
 * 
 */

/* eslint-disable max-lines-per-function */

import { GameGateway } from '@app/gateways/game/game.gateway';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { Game } from '@app/model/schema/game/game';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { GameValidatorService } from './validation/game-validator.service';

describe('GameService', () => {
  let service: GameService;

  const mockGameGateway = {
    serverEmitGameCreated: jest.fn(),
    serverEmitGameDeleted: jest.fn(),
    serverEmitGameUpdated: jest.fn(),
    serverEmitGameVisibilityToggled: jest.fn(),
  };

  const mockGameModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    exists: jest.fn(),
    deleteOne: jest.fn(),
  };


  const mockGameValidatorService = {
    validate: jest.fn(),
  };


  const mockCreateGameDto = {
    name: 'game de Test',
    description: 'Description test',
    mode: 'CLASSIC',
    grid: {
      gridSize: 10,
      grid: [],
    },
  } as unknown as CreateGameDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: GameGateway,
          useValue: mockGameGateway,
        },
        {
          provide: getModelToken(Game.name),
          useValue: mockGameModel,
        },
        {
          provide: GameValidatorService,
          useValue: mockGameValidatorService,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);

    // IMPORTANT : On remet les compteurs à zéro avant chaque test
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('createGame', () => {
    it('devrait créer un game et retourner son ID (Succès)', async () => {

      mockGameModel.exists.mockResolvedValue(null);
      mockGameValidatorService.validate.mockResolvedValue(undefined);

      const createdGame = { _id: 'nouvel-id-123', name: 'game de Test' };
      mockGameModel.create.mockResolvedValue(createdGame);


      const result = await service.createGame(mockCreateGameDto);


      expect(mockGameModel.exists).toHaveBeenCalledWith({ name: mockCreateGameDto.name });
      expect(mockGameValidatorService.validate).toHaveBeenCalledWith(mockCreateGameDto);
      expect(mockGameModel.create).toHaveBeenCalled();
      expect(result).toBe('nouvel-id-123');
    });

    it('devrait lancer une erreur si le nom est déjà pris', async () => {

      mockGameModel.exists.mockResolvedValue({ _id: 'id-existant' });


      await expect(service.createGame(mockCreateGameDto))
        .rejects
        .toThrow(BadRequestException);


      expect(mockGameModel.create).not.toHaveBeenCalled();
    });

    it('devrait lancer une erreur si la validation échoue', async () => {

      mockGameModel.exists.mockResolvedValue(null);

      const errorMsg = 'Erreur de validation';
      mockGameValidatorService.validate.mockRejectedValue(new Error(errorMsg));


      await expect(service.createGame(mockCreateGameDto))
        .rejects
        .toThrow(errorMsg);

      expect(mockGameModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllGames', () => {
    it('devrait retourner la liste des gamex', async () => {
      const games = [{ name: 'game A' }, { name: 'game B' }];
      mockGameModel.find.mockResolvedValue(games);

      const result = await service.getAllGames();

      expect(result).toEqual(games);
      expect(mockGameModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('getGameById', () => {
    it('devrait retourner un game spécifique', async () => {
      const game = { name: 'game A', _id: '123' };
      mockGameModel.findById.mockResolvedValue(game);

      const result = await service.getGameById('123');

      expect(result).toEqual(game);
      expect(mockGameModel.findById).toHaveBeenCalledWith('123');
    });

    it('devrait retourner null si introuvable', async () => {
      mockGameModel.findById.mockResolvedValue(null);

      const result = await service.getGameById('inconnu');

      expect(result).toBeNull();
    });
  });

  describe('deleteGame', () => {
    it('devrait supprimer le game par son ID', async () => {
      mockGameModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.deleteGame('123');

      expect(mockGameModel.deleteOne).toHaveBeenCalledWith({ _id: '123' });
    });
  });

  describe('validateUniqueName', () => {
    it('ne devrait rien faire si le nom est libre', async () => {
      mockGameModel.exists.mockResolvedValue(null);
      await expect(service.validateUniqueName('Nouveau Nom')).resolves.not.toThrow();
    });

    it('devrait lancer BadRequestException si le nom est pris', async () => {
      mockGameModel.exists.mockResolvedValue({ _id: 'id-existant' });

      await expect(service.validateUniqueName('Nom Pris'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('devrait exclure le game courant de la vérification quand excludeId est fourni', async () => {
      mockGameModel.exists.mockResolvedValue(null);

      await service.validateUniqueName('Mon game', 'id-courant');

      expect(mockGameModel.exists).toHaveBeenCalledWith({
        name: 'Mon game',
        _id: { $ne: 'id-courant' },
      });
    });

    it('ne devrait pas inclure _id dans la requête quand excludeId est absent', async () => {
      mockGameModel.exists.mockResolvedValue(null);

      await service.validateUniqueName('Mon game');

      expect(mockGameModel.exists).toHaveBeenCalledWith({ name: 'Mon game' });
    });

    it('devrait lancer BadRequestException si un AUTRE game porte déjà ce nom (édition)', async () => {
      mockGameModel.exists.mockResolvedValue({ _id: 'autre-id' });

      await expect(service.validateUniqueName('Nom Pris', 'id-courant'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('updateGame', () => {
    const gameId = 'id-game-existant';
    const mockExistingGame = { _id: gameId, name: 'Ancien Nom', mode: 'CLASSIC' };

    it('devrait mettre à jour un game avec son propre nom sans erreur', async () => {
      mockGameModel.findById.mockResolvedValue(mockExistingGame);
      mockGameValidatorService.validate.mockResolvedValue(undefined);
      mockGameModel.exists.mockResolvedValue(null);
      mockGameModel.findByIdAndUpdate.mockResolvedValue({ ...mockExistingGame });

      const dto = { name: 'Ancien Nom', grid: undefined, mode: undefined } as never;
      await expect(service.updateGame(gameId, dto)).resolves.not.toThrow();

      expect(mockGameModel.exists).toHaveBeenCalledWith({
        name: 'Ancien Nom',
        _id: { $ne: gameId },
      });
    });

    it('devrait bloquer si le nouveau nom est déjà pris par un autre game', async () => {
      mockGameModel.findById.mockResolvedValue(mockExistingGame);
      mockGameValidatorService.validate.mockResolvedValue(undefined);
      mockGameModel.exists.mockResolvedValue({ _id: 'autre-game' });

      const dto = { name: 'Nom Déjà Pris', grid: undefined, mode: undefined } as never;
      await expect(service.updateGame(gameId, dto))
        .rejects
        .toThrow(BadRequestException);

      expect(mockGameModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('devrait lancer NotFoundException si le game est introuvable', async () => {
      mockGameModel.findById.mockResolvedValue(null);

      await expect(service.updateGame('id-inconnu', {} as never))
        .rejects
        .toThrow(NotFoundException);
    });
  });
});