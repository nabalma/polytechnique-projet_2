/* eslint-disable max-lines-per-function */
/* La grid qui fait lobjet de tests a plusieurs attributs . Ce qui rend le nombre de ligne plethore */
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EditionTool } from '@app/services/edition-tools/edition-tool';
import { EditionService } from '@app/services/edition/edition-service/edition.service';
import { GridSize, ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { GameInterface } from '@common/interfaces/game-frontend/game-interface';


describe('Edition Service ', () => {

    let editionService: EditionService;
    let httpMock: HttpTestingController;
    let editionToolSpy: jasmine.SpyObj<EditionTool>;

    const mockGame: GameInterface = {
        _id: 'game-id-123',
        name: 'Mock Game',
        mode: GameMode.CTF,
        description: 'Capture the flag test game.',
        isVisible: true,
        createdAt: new Date(),
        updateAt: new Date(),
        imageUrl: 'assets/images/mock-game.png',
        grid: {
            id: 1,
            gridSize: GridSize.MEDIUM,
            grid: [
                [
                    {
                        tile: {
                            tileType: TileType.DEFAULT,
                            imageSrc: '',
                        },
                        objects: {
                            objectType: ObjectType.START_POINT,
                            nbCells: 1,
                            imageSrc: 'assets/images/start.png',
                        },
                    },
                    {
                        tile: {
                            tileType: TileType.WALL,
                            imageSrc: '',
                        },
                    },
                ],
                [
                    {
                        tile: {
                            tileType: TileType.DEFAULT,
                            imageSrc: '',
                        },
                        objects: {
                            objectType: ObjectType.FLAG,
                            nbCells: 1,
                            imageSrc: 'assets/images/flag.png',
                        },
                    },
                    {
                        tile: {
                            tileType: TileType.DEFAULT,
                            imageSrc: '',
                        },
                    },
                ],
            ],
        },
    };

    beforeEach(() => {

        const spyEditionTool = jasmine.createSpyObj('EditionTool', ['createDefaultTile', 'createDefaultObject']);

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                EditionService,
                { provide: EditionTool, useValue: spyEditionTool },
                { provide: EditionService },
            ],
        });

        editionService = TestBed.inject(EditionService);
        httpMock = TestBed.inject(HttpTestingController);
        editionToolSpy = TestBed.inject(EditionTool) as jasmine.SpyObj<EditionTool>;

    });

    afterEach(() => {
        httpMock.verify();
    });

    it('getIndex should return correct coordinates', () => {

        const gridSize: GridSize = GridSize.SMALL;
        const caseId = 15;

        expect(editionService.getIndex(caseId, gridSize)).toEqual({ x: 1, y: 5 });

    });

    it('CreateEmptyGrid should create grid with default tile and object in each cell', () => {

        const size = GridSize.MEDIUM;
        const gameMap = editionService.createEmptyGrid(size);

        expect(gameMap.gridSize).toBe(size);
        expect(editionToolSpy.createDefaultTile).toHaveBeenCalled();
        expect(editionToolSpy.createDefaultObject).toHaveBeenCalled();
    });


    it('getGameById should return a game', async () => {

        const promise = editionService.getGameById('game-id-123');

        const req = httpMock.expectOne(`${editionService['baseUrl']}/game/game-id-123`);
        expect(req.request.method).toBe('GET');

        req.flush(mockGame);

        const resultPromise = await promise;

        expect(resultPromise).toBe(mockGame);
    });


    it('updateGame should update a game', async () => {

        const promise = editionService.updateGame('game-id-123', { name: 'Mock' });

        const req = httpMock.expectOne(`${editionService['baseUrl']}/game/game-id-123`);
        expect(req.request.method).toBe('PATCH');

        req.flush('game modifié avec succès');

        const resultPromise = await promise;

        expect(resultPromise).toBe('game modifié avec succès');
    });


});