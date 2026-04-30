import { Component, computed, EventEmitter, inject, input, Output } from '@angular/core';
import { CellComponent } from '@app/components/cell/cell.component';
import { MapService } from '@app/services/match/map/map.service';
import { MatchService } from '@app/services/match/match.service';
import { CELL_SIZE_LARGE, CELL_SIZE_MEDIUM, CELL_SIZE_SMALL } from '@common/constants/game-grid/game-grid.constants';
import { PLAYER_ABANDONED_FLAG } from '@common/constants/game-view/game-view.constants';
import { GridSize, ObjectType, TargetType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { CellInterface, CellRightClickPayload } from '@common/interfaces/game-frontend/game-grid-interface';
import { GameMap } from '@common/interfaces/game-frontend/game-interface';
import { Position } from '@common/interfaces/match/match-interface';


@Component({
    selector: 'app-game-grid',
    standalone: true,
    imports: [CellComponent],
    templateUrl: './game-grid.component.html',
    styleUrl: './game-grid.component.scss',
})
export class GameGridComponent {
    @Output() cellClicked = new EventEmitter<number>();
    @Output() cellRightClicked = new EventEmitter<CellRightClickPayload>();
    gameMap = input.required<GameMap>();
    ctfStartFlatIndex = input<number | null>(null);
    currentPlayerHasFlag = input<boolean>(false);
    playersList: string[] = [];
    selectedCell: number | null = null;

    matchService = inject(MatchService);
    mapService = inject(MapService);
    readonly targetType = TargetType;


    playersByCell = computed(() => {
        const map = new Map<number, string>();
        this.matchService.players().forEach((player) => {
            if (!player || !player.position) return;
            if (player.remainingActions === PLAYER_ABANDONED_FLAG) return;
            const flatPos = player.position.y * this.gridSize + player.position.x;
            if (flatPos >= 0 && player.id) {
                map.set(flatPos, player.id);
                if (this.playersList.length === 0) this.playersList.push(player.name);
            }
        });
        return map;
    });

    get gridSize(): number {
        return this.gameMap().gridSize;
    }

    get cellSize(): string {
        switch (this.gameMap().gridSize) {
            case GridSize.LARGE:
                return CELL_SIZE_LARGE;
            case GridSize.MEDIUM:
                return CELL_SIZE_MEDIUM;
            default:
                return CELL_SIZE_SMALL;
        }
    }

    get cells(): CellInterface[] {
        const grid: CellInterface[][] = this.gameMap().grid ?? [];
        return grid.flatMap((row) => row);
    }

    getTileImage(cell: CellInterface): string {
        return cell.tile.imageSrc;
    }

    getObjectImage(cell: CellInterface): string | null {
        if (!cell.objects || cell.objects.objectType === ObjectType.DEFAULT) return null;
        return cell.objects.imageSrc;
    }

    getCell(flatIndex: number): CellInterface | null {
        const grid = this.gameMap().grid;
        if (!grid) return null;
        const gridSize = this.gameMap().gridSize;
        const x = Math.floor(flatIndex / gridSize);
        const y = flatIndex % gridSize;
        return grid[x]?.[y] ?? null;
    }

    hasPayer(index: number): boolean {
        return this.playersByCell()?.has(index) ?? false;
    }

    private static readonly neighborDirections = [
        { deltaX: 1, deltaY: 0 }, { deltaX: -1, deltaY: 0 },
        { deltaX: 0, deltaY: 1 }, { deltaX: 0, deltaY: -1 },
    ];
    /**
     * Ce signal est necessaire pour l'utilisation des utilisateurs pour effectuer des actions
     */
    /*  eslint-disable max-lines-per-function, complexity*/
    actionTargets = computed((): Map<number, TargetType> => {
        const result = new Map<number, TargetType>();
        if (!this.matchService.actionMode || !this.matchService.isMyTurn()) return result;
        const currentPlayer = this.matchService.currentPlayer;
        if (!currentPlayer?.position || (currentPlayer.remainingActions ?? 0) <= 0) return result;
        const gridSize = this.gameMap().gridSize;
        const grid = this.gameMap().grid ?? [];
        for (const { deltaX, deltaY } of GameGridComponent.neighborDirections) {
            const neighborX = currentPlayer.position.x + deltaX;
            const neighborY = currentPlayer.position.y + deltaY;
            if (neighborX < 0 || neighborY < 0 || neighborX >= gridSize || neighborY >= gridSize) continue;
            const flatIndex = neighborY * gridSize + neighborX;
            const resolvedType = this.resolveAdjacentTargetType(grid[neighborY]?.[neighborX], flatIndex);
            if (resolvedType === this.targetType.Sanctuary) {
                for (const idx of this.getSanctuaryGroupCells(neighborY, neighborX, grid, gridSize)) {
                    result.set(idx, this.targetType.Sanctuary);
                }
            } else if (resolvedType !== null) {
                result.set(flatIndex, resolvedType);
            }
        }
        return result;
    });

    /** Cette fonction n'est pas divisible par peur de perdre certaines confirmation 
     * ou d'augmenter la granulalité dans le code
     */
    /* eslint-disable max-lines-per-function */
    private getSanctuaryGroupCells(row: number, col: number, grid: CellInterface[][], gridSize: number): number[] {
        const objectType = grid[row]?.[col]?.objects?.objectType;
        const topLeftCandidates = [
            { topRow: row, leftCol: col },
            { topRow: row, leftCol: col - 1 },
            { topRow: row - 1, leftCol: col },
            { topRow: row - 1, leftCol: col - 1 },
        ];
        for (const { topRow, leftCol } of topLeftCandidates) {
            const group = [
                { groupRow: topRow, groupCol: leftCol },
                { groupRow: topRow, groupCol: leftCol + 1 },
                { groupRow: topRow + 1, groupCol: leftCol },
                { groupRow: topRow + 1, groupCol: leftCol + 1 },
            ];
            if (group.every(({ groupRow, groupCol }) =>
                groupRow >= 0 && groupCol >= 0 && groupRow < gridSize && groupCol < gridSize &&
                grid[groupRow]?.[groupCol]?.objects?.objectType === objectType,
            )) {
                return group.map(({ groupRow, groupCol }) => groupRow * gridSize + groupCol);
            }
        }
        return [row * gridSize + col];
    }

    private isCellDoor(cell: CellInterface): boolean {
        const tileType = cell.tile?.tileType;
        return tileType === TileType.DOOR_OPEN || tileType === TileType.DOOR_CLOSED;
    }

    private isCellActiveSanctuary(cell: CellInterface): boolean {
        const objType = cell.objects?.objectType;
        return (objType === ObjectType.COMBAT_SANCTUARY || objType === ObjectType.HEAL_SANCTUARY)
            && cell.objects?.isActive !== false;
    }

    private resolveAdjacentTargetType(cell: CellInterface | undefined, flatIndex: number): TargetType | null {
        if (!cell) return null;
        if (this.isCellDoor(cell)) return this.targetType.Door;
        if (this.isCellActiveSanctuary(cell)) return this.targetType.Sanctuary;
        const playerIdHere = this.playersByCell().get(flatIndex);
        if (playerIdHere && playerIdHere !== this.matchService.currentPlayerId) return this.targetType.Player;
        return null;
    }

    isReachable(index: number): boolean {
        const gridSize = this.gameMap().gridSize;
        const pos = { x: index % gridSize, y: Math.floor(index / gridSize) };
        const currentPlayer = this.matchService.currentPlayer;
        if (currentPlayer?.position?.x === pos.x && currentPlayer?.position?.y === pos.y) return true;
        return this.matchService.reachableCells().some((c) => c.x === pos.x && c.y === pos.y);
    }

    isSelected(index: number) {
        return this.matchService.selectedCell === index;
    }

    clicked(index: number) {
        this.selectedCell = index;
        this.cellClicked.emit(index);
        this.matchService.selectedCell = index;
    }

    rightClicked(event: MouseEvent, index: number): void {
        event.preventDefault();
        const gridSize = this.gameMap().gridSize;
        const position: Position = { x: index % gridSize, y: Math.floor(index / gridSize) };
        const cellInfo = this.cells[index];
        const playerId = this.playersByCell().get(index) ?? null;
        this.cellRightClicked.emit({ event, position, cellInfo, playerId });
    }
}
