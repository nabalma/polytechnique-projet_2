import { GameValidationError } from '@app/constants/game-validation.constants';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';

import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { BadRequestException, Injectable } from '@nestjs/common';
import { validateDescription } from './rules/description/game-description-validation.rules';
import { validateDoors } from './rules/door/game-door-validation.rules';
import { validateFlag } from './rules/flag/game-flag-validation.rules';
import { validateImageUrl } from './rules/game-url-validation/game-url-validation.rules';
import { areAllAccessibleTilesReachable } from './rules/map-accessibility/game-map-accessibility-validation.rules';
import { hasSufficientTerrainRatio } from './rules/map-terrain/game-map-terrain-ratio-validation.rules';
import { validateMode } from './rules/mode/game-mode-validation.rules';
import { validateStartingPoints } from './rules/starting-point/game-starting-point-validation.rules';


type AnyGameDto = CreateGameDto | UpdateGameDto;

@Injectable()
export class GameValidatorService {


  validate(game: AnyGameDto): void {
    const errors: GameValidationError[] = this.validateGame(game);

    const filteredErrors = errors.filter((validationError) => validationError != null);

    if (filteredErrors.length > 0) {
      throw new BadRequestException({
        message: 'Le game est invalide',
        error: filteredErrors,
      });
    }
  }

  private validateGame(
    game: AnyGameDto,
  ): GameValidationError[] {
    return [

      validateDoors(game.grid),
      ...validateStartingPoints(game.grid),
      validateFlag(game.grid.grid, game.mode),
      hasSufficientTerrainRatio(game.grid),
      areAllAccessibleTilesReachable(game.grid),

    ];
  }


  validateImageUrl(url: string): GameValidationError {
    return validateImageUrl(url);
  }

  validateGameDescription(description: string): GameValidationError {
    return validateDescription(description);
  }

  validateGameMode(mode: GameMode): GameValidationError {
    return validateMode(mode);
  }

}


