import { GridSize } from '@common/enum/game/grid/game-grid.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, ValidateNested } from 'class-validator';
import { CellDto } from './cell.dto';

export class GridDto {
    @ApiProperty({ enum: GridSize, description: 'Taille de la grille (10, 15 ou 20)' })
    @IsEnum(GridSize)
    gridSize: GridSize;

    @ApiProperty({
        type: 'array',
        items: { type: 'array', items: { $ref: '#/components/schemas/CellDto' } },
        description: 'Matrice 2D des cellules',
    })
    @IsArray()
    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => CellDto)
    grid: CellDto[][];
}