
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { GridDto } from './grid.dto';

const MAX_DESCRIPTION_LENGTH = 200;

export class CreateGameDto {

  @ApiProperty({
    example: 'LOG2995/client/image.png',
    description: "URL(Public id Cloudinary) de l'image du game", required: false,
  })
  @IsString()
  @Matches(/^LOG2995\/client\/[a-zA-Z0-9_.-]+$/, {
    message: 'L\'image doit respecter une structure LOG2995/client/xx ',
  })
  imageUrl: string;

  @ApiProperty({ example: 'Le Labyrinthe Maudit', description: 'Nom du game' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Une carte difficile...', description: 'Description du game' })
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty({ message: 'La description ne peut pas être vide si elle est fournie' })
  @MaxLength(MAX_DESCRIPTION_LENGTH, { message: 'La description est trop longue' })
  description: string;

  @ApiProperty({ enum: GameMode, description: 'Mode de game (CLASSIC ou CTF)' })
  @IsEnum(GameMode, { message: 'Le mode de game est invalide doit être CLASSIC ou CTF' })
  mode: GameMode;

  @ApiProperty({ type: GridDto, description: 'La carte complète du game' })
  @ValidateNested()
  @Type(() => GridDto)
  grid: GridDto;

  @ApiProperty({
    example: true,
    description: 'Indique si le game est visible ou non',
  })
  @IsBoolean()
  isVisible: boolean;
}
