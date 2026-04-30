import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class TileDto {
    @ApiProperty({ enum: TileType, description: 'Le type de terrain' })
    @IsEnum(TileType)
    tileType: TileType;

    @ApiProperty({ required: false, description: "URL de l'image (optionnel)" })
    @IsOptional()
    @IsString()
    imageSrc?: string;
}

export class ObjectDto {
    @ApiProperty({ enum: ObjectType, description: "Le type d'objet" })
    @IsEnum(ObjectType)
    objectType: ObjectType;

    @ApiProperty({ description: 'Nombre de cases ou cellules de prends ce objet sur la grille' })
    @IsNumber()
    nbCells: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    imageSrc?: string;
}