import { GameGateway } from '@app/gateways/game/game.gateway';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { Game } from '@app/model/schema/game/game';
import { GameService } from '@app/services/game/game.service';
import { Test, TestingModule } from '@nestjs/testing';
import { GameController } from './game.controller';

/* eslint-disable max-lines-per-function */
//  On désactive cette règle parce que ce bloc de test est volontairement plus long afin de regrouper tous les cas du contrôleur au même endroit.
describe('GameController', () => {
  let controller: GameController;

  const mockGameService = {
    getAllGames: jest.fn(),
    getGameById: jest.fn(),
    createGame: jest.fn(),
    deleteGame: jest.fn(),
  };

  const mockGameGateway = {
    emitGameCreated: jest.fn(),
    emitGameUpdated: jest.fn(),
    emitGameDeleted: jest.fn(),
    emitGameVisibilityToggled: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        {
          provide: GameService,
          useValue: mockGameService,
        },
        {
          provide: GameGateway,
          useValue: mockGameGateway,
        },
      ],
    }).compile();

    controller = module.get<GameController>(GameController);


    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('allGames (GET /)', () => {
    it('devrait retourner un tableau de gamex', async () => {
      
      const result: Game[] = [{ name: 'game 1' } as Game, { name: 'game 2' } as Game];
      mockGameService.getAllGames.mockResolvedValue(result);

      const response = await controller.allGames();

      expect(response).toBe(result);
      expect(mockGameService.getAllGames).toHaveBeenCalled();
    });
  });

  describe('getGame (GET /:id)', () => {
    it('devrait retourner un game spécifique', async () => {

      const gameId = '123';
      const result = { name: 'game Trouvé', _id: gameId } as unknown as unknown as Game;
      mockGameService.getGameById.mockResolvedValue(result);

      const response = await controller.getGame(gameId);

      expect(response).toEqual(result);
      expect(mockGameService.getGameById).toHaveBeenCalledWith(gameId);
    });
  });

  describe('createGame (POST /)', () => {
    it('devrait créer un game et retourner son ID', async () => {
      const dto: CreateGameDto = { name: 'Nouveau game', grid: {} as unknown } as CreateGameDto;
      const createdId = 'new-id-123';
      mockGameService.createGame.mockResolvedValue(createdId);

      const response = await controller.createGame(dto);

      expect(response).toBe(createdId);
      expect(mockGameService.createGame).toHaveBeenCalledWith(dto);
    });
  });

  describe('deleteGame (DELETE /:id)', () => {
    it('devrait supprimer un game', async () => {
      const gameId = 'to-delete';
      mockGameService.deleteGame.mockResolvedValue(undefined);

      await controller.deleteGame(gameId);

      expect(mockGameService.deleteGame).toHaveBeenCalledWith(gameId);
    });
  });
});