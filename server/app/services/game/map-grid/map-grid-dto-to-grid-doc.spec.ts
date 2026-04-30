/* eslint-disable max-lines-per-function -- On désactive cette règle parce que ce fichier de test contient un scénario plus long que la limite autorisée. */

import { GridDto } from '@app/model/dto/game/grid.dto';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { mapGridDtoToGridDocument } from './map-grid-dto-to-grid-doc';


describe('mapGridDtoToGridDocument', () => {

    it('devrait mapper correctement une grille complète (Tuiles + Objets)', () => {
        const gridDto: GridDto = {
            gridSize: 2,
            grid: [
                [
                    {
                        tile: { tileType: TileType.DEFAULT, imageSrc: 'grass.png' },
                        objects: { objectType: ObjectType.START_POINT, nbCells: 1, imageSrc: 'flag.png' },
                    },
                ],
            ],
        } as unknown as GridDto;

        const result = mapGridDtoToGridDocument(gridDto);

        expect(result.gridSize).toBe(2);
        expect(result.grid[0][0].tile.tileType).toBe(TileType.DEFAULT);
        expect(result.grid[0][0].objects).toBeDefined();
        expect(result.grid[0][0].objects?.objectType).toBe(ObjectType.START_POINT);
    });

    it('devrait ignorer la propriété "objects" si elle est absente (Undefined)', () => {
        const gridDto: GridDto = {
            gridSize: 2,
            grid: [
                [
                    {
                        tile: { tileType: TileType.WATER, imageSrc: 'water.png' },
                        objects: undefined,
                    },
                ],
            ],
        } as unknown as GridDto;

        const result = mapGridDtoToGridDocument(gridDto);

        expect(result.grid[0][0].tile.tileType).toBe(TileType.WATER);

        expect(result.grid[0][0]).not.toHaveProperty('objects');

        expect(result.grid[0][0].objects).toBeUndefined();
    });

    it('devrait conserver la structure 2D de la grille', () => {
        // ARRANGE
        const gridDto = {
            gridSize: 2,
            grid: [
                [{}, {}],
                [{}, {}],
            ],
        } as unknown as GridDto;

        const result = mapGridDtoToGridDocument(gridDto);

        expect(result.grid.length).toBe(2);
        expect(result.grid[0].length).toBe(2);
    });
});