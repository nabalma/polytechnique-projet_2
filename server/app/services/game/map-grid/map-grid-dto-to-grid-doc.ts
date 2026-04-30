import { GridDto } from '@app/model/dto/game/grid.dto';
import { Cell } from '@app/model/schema/game/cell';
import { GridSize } from '@common/enum/game/grid/game-grid.enum';

export function mapGridDtoToGridDocument(gridDto: GridDto): { gridSize: GridSize, grid: Cell[][] } {
    const { gridSize, grid } = gridDto;

    const mappedGrid: Cell[][] = grid.map((row) => {

        return row.map((cellDto) => {
            const cell: Cell = {
                tile: cellDto.tile,
                ...(cellDto.objects ? { objects: cellDto.objects } : {}),
            };

            return cell;
        });
    });

    return { gridSize, grid: mappedGrid };
}
