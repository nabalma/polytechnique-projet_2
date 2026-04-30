import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { Game } from '@app/model/schema/game/game';
import { GameService } from '@app/services/game/game.service';
import { APIroutes } from '@common/routes/api-routes';
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Games')
@Controller(APIroutes.GAME.ROOT)
export class GameController {
    constructor(
        private readonly gameService: GameService,
    ) {}


    @Get('/')
    @ApiOkResponse({ description: 'Liste de tous les jeux', type: Game, isArray: true })
    async allGames(): Promise<Game[]> {
        const games = await this.gameService.getAllGames();
        return games;
    }

    @Get('/:id')
    @ApiOkResponse({ description: 'Retourne un game spécifique', type: Game })
    @ApiNotFoundResponse({ description: 'game introuvable' })
    async getGame(@Param('id') id: string): Promise<Game> {
        const game = await this.gameService.getGameById(id);
        return game;
    }


    @Post('/')
    @ApiCreatedResponse({ description: 'Le game a été créé', type: String })
    @ApiConflictResponse({ description: 'Nom déjà pris' })
    async createGame(@Body() gameDto: CreateGameDto): Promise<string> {
        const gameId = await this.gameService.createGame(gameDto);
        return gameId;
    }


    @Patch('/:id/visibility')
    @ApiOkResponse({ description: 'La visibilite du game modifié avec succès' })
    @ApiNotFoundResponse({ description: 'game introuvable' })
    async toggleGameVisibility(@Param('id') id: string): Promise<string> {
        const gameId = await this.gameService.toggleVisibility(id);
        return gameId;
    }


    @Patch('/:id')
    @ApiOkResponse({ description: 'game modifié avec succès' })
    @ApiNotFoundResponse({ description: 'game introuvable' })
    async updateGame(@Param('id') id: string, @Body() gameDto: UpdateGameDto): Promise<string> {
        const result = await this.gameService.updateGame(id, gameDto);
        return result;
    }


    @Delete('/:id')
    @ApiOkResponse({ description: 'game supprimé' })
    @ApiNotFoundResponse({ description: 'game introuvable' })
    async deleteGame(@Param('id') id: string): Promise<void> {
        await this.gameService.deleteGame(id);
    }
}
