import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { ObjectDto, TileDto } from './grid-content.dto';

export class CellDto {
    @ApiProperty({ type: TileDto, description: 'La tuile de terrain sur cette case' })
    @ValidateNested()
    @Type(() => TileDto)
    tile: TileDto;

    @ApiProperty({ type: ObjectDto, required: false, description: "L'objet posé sur la case (s'il y en a un)" })
    @IsOptional()
    @ValidateNested()
    @Type(() => ObjectDto)
    objects?: ObjectDto;
}