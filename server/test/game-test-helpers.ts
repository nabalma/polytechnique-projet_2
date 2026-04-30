import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { GridDto } from '@app/model/dto/game/grid.dto';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';

// Crée une structure de game vide et valide par défaut
const GRID_SIZE_DEFAULT = 10;

export const createBaseGame = (id: string, mode: GameMode, size: number = GRID_SIZE_DEFAULT): CreateGameDto => {
    return {
        name: `game Test ${id}`,
        description: 'game généré pour les tests',
        mode,
        imageUrl: 'assets/test.png',
        isVisible: false,
        grid: {
            gridSize: size,
            // Création d'une grille vide (Terre partout, aucun objet)
            grid: Array.from({ length: size }, () =>
                Array.from({ length: size }, () => ({
                    tile: { tileType: TileType.DEFAULT, imageSrc: '' },
                    objects: undefined, // Important: undefined, pas null !
                })),
            ),
        },
    };
};

// Place un objet (Porte, Drapeau, Départ...) sur la grille
export const placeObject = (game: CreateGameDto, x: number, y: number, type: ObjectType) => {
    if (game.grid.grid[y] && game.grid.grid[y][x]) {
        game.grid.grid[y][x].objects = {
            objectType: type,
            nbCells: 1,
            imageSrc: '',
        };
    }
};

// Change le type de terrain (Mur, Eau, Glace...)
export const setTile = (game: CreateGameDto, x: number, y: number, type: TileType) => {
    if (game.grid.grid[y] && game.grid.grid[y][x]) {
        game.grid.grid[y][x].tile.tileType = type;
    }
};


// Helper local juste pour ce fichier de test
export const createMockGrid = (layout: string[]): GridDto => {
    const grid = layout.map((row) => {
        return row.split('').map((char) => {
            let type = TileType.DEFAULT;
            if (char === 'X') type = TileType.WALL;
            if (char === 'W') type = TileType.WATER;
            if (char === 'I') type = TileType.ICE;

            // On retourne la structure exacte d'une cellule
            return {
                tile: { tileType: type, imageSrc: '' },
                objects: undefined,
            };
        });
    });

    // On retourne juste le GridDto, pas tout le GameDto
    return {
        grid,
        gridSize: layout.length, // ou { x: layout[0].length, y: layout.length } selon ton interface
    };
};