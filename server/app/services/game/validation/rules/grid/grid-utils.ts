import { CellDto } from '@app/model/dto/game/cell.dto';
import { GridDto } from '@app/model/dto/game/grid.dto';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { CellInterface } from '@common/interfaces/game-frontend/game-grid-interface';

export function getCoordinateKey(x: number, y: number): string {
    return `${x},${y}`;
}

export function processNeighbors(
    x: number,
    y: number,
    grid: GridDto,
    visited: Set<string>,
    queue: [number, number][],
): void {
    const neighbors = getNeighbors(x, y, grid);

    for (const [neighborX, neighborY] of neighbors) {
        const key = getCoordinateKey(neighborX, neighborY);

        if (!visited.has(key)) {
            visited.add(key);
            queue.push([neighborX, neighborY]);
        }
    }
}

export function runGridBfs(grid: GridDto): Set<string> {
    const visited = new Set<string>();
    const queue: [number, number][] = [];

    const start = findFirstAccessibleCell(grid);
    if (!start) return visited;

    const [startX, startY] = start;
    const startKey = getCoordinateKey(startX, startY);

    queue.push(start);
    visited.add(startKey);

    while (queue.length) {
        const [currentX, currentY] = queue.shift() as [number, number];

        processNeighbors(currentX, currentY, grid, visited, queue);
    }

    return visited;
}

export function flattenGrid(grid: CellDto[][]): CellDto[] {
    return grid.flat();
}

export function findFirstAccessibleCell(grid: GridDto): [number, number] {
    for (let y = 0; y < grid.grid.length; y++) {
        for (let x = 0; x < grid.grid[y].length; x++) {
            if (isAccessibleTile(grid.grid[y][x])) {
                return [x, y];
            }
        }
    }
}
export function getNeighbors(
    x: number,
    y: number,
    grid: GridDto): [number, number][] {
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    return directions
        .map(([deltaX, deltaY]) => [x + deltaX, y + deltaY] as [number, number])
        .filter(([neighborX, neighborY]) =>
            grid.grid[neighborY] &&
            grid.grid[neighborY][neighborX] &&
            isAccessibleTile(grid.grid[neighborY][neighborX]),
        );
}


export function isAccessibleTile(cell: CellInterface): boolean {

    if (haveSanctuary(cell)) {
        return false;
    }
    return (
        cell.tile.tileType === TileType.DEFAULT ||
        cell.tile.tileType === TileType.WATER ||
        cell.tile.tileType === TileType.ICE ||
        cell.tile.tileType === TileType.DOOR_CLOSED ||
        cell.tile.tileType === TileType.DOOR_OPEN
    );
}

function haveSanctuary(cell: CellInterface): boolean {
    return (cell.objects?.objectType === ObjectType.COMBAT_SANCTUARY ||
        cell.objects?.objectType === ObjectType.HEAL_SANCTUARY);
}