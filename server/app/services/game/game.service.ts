import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { FIELDS_FOR_MATCH, Game, GameDocument } from '@app/model/schema/game/game';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { GameMap } from '@common/interfaces/game-frontend/game-interface';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { mapGridDtoToGridDocument } from './map-grid/map-grid-dto-to-grid-doc';
import { GameValidatorService } from './validation/game-validator.service';

@Injectable()
export class GameService {

    constructor(
        @InjectModel(Game.name)
        private readonly gameModel: Model<GameDocument>,
        private readonly gameValidatorService: GameValidatorService,

    ) {}

    async createGame(game: CreateGameDto): Promise<string> {
        await this.validateUniqueName(game.name);
        await this.gameValidatorService.validate(game);

        const gameToCreate: Game = {
            ...game,
            grid: mapGridDtoToGridDocument(game.grid),
        };

        const createdGame = await this.gameModel.create(gameToCreate);

        return createdGame._id.toString();

    }

    async validateUniqueName(gameName: string, excludeId?: string): Promise<void> {
        const query: Record<string, unknown> = { name: gameName };
        if (excludeId) query._id = { $ne: excludeId };
        const exists = await this.gameModel.exists(query);
        if (exists) {
            throw new BadRequestException(`Le nom de jeu '${gameName}' est déjà pris.`);
        }
    }

    async getAllGames(): Promise<Game[]> {
        const games = await this.gameModel.find({});
        return games;
    }

    async deleteGame(id: string): Promise<void> {
        const result = await this.gameModel.deleteOne({ _id: id });

        if (result.deletedCount === 0) {
            throw new NotFoundException('Jeu non trouvé');
        }
    }

    async getGameById(id: string): Promise<Game> {
        const game = await this.gameModel.findById(id);
        return game;
    }

    async getGameGrid(gameId: string): Promise<GameMap> {
        return await this.gameModel.findById(gameId).select(FIELDS_FOR_MATCH);
    }
    async toggleVisibility(id: string): Promise<string> {
        const game = await this.gameModel.findById(id);
        if (!game) throw new NotFoundException('Jeu non trouvé');

        game.isVisible = !game.isVisible;
        await game.save();


        return game.id;
    }

    async updateGame(id: string, updateGameDto: UpdateGameDto): Promise<string> {
        const game = await this.gameModel.findById(id);
        if (!game) throw new NotFoundException('Jeu non trouvé');

        const completeGameToValidate: CreateGameDto = {
            name: updateGameDto.name ?? game.name, description: updateGameDto.description ?? game.description,
            imageUrl: updateGameDto.imageUrl ?? game.imageUrl, mode: (updateGameDto.mode ?? game.mode) as GameMode,
            grid: updateGameDto.grid ?? game.grid,
            isVisible: updateGameDto.isVisible ?? game.isVisible,
        };

        if (updateGameDto.grid || updateGameDto.mode) {
            await this.gameValidatorService.validate(completeGameToValidate);
        }

        if (updateGameDto.name) {
            await this.validateUniqueName(updateGameDto.name, id);
        }

        const updated = await this.gameModel.findByIdAndUpdate(id, { $set: updateGameDto }, { new: true, runValidators: true });

        if (!updated) throw new NotFoundException('Jeu non trouvé');

        return 'game modifié avec succès';
    }
}
