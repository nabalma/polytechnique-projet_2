
import { Component, ElementRef, input, OnDestroy, OnInit, output, signal, ViewChild, WritableSignal } from '@angular/core';
import { MouseService } from '@app/services/common/mouse-service/mouse.service';
import { EditionTool } from '@app/services/edition-tools/edition-tool';
import { EditionService } from '@app/services/edition/edition-service/edition.service';
import {
    areMapsEqual,
    isSanctuary,
    verifyObjectExist,
} from '@app/services/edition/edition-service/utils/edition-page.utils';
import { SaveRestartSignalService } from '@app/services/edition/save-restart-service/save-restart.service';
import { OBJECT_ON_BLOCKING_TILE_ERROR, SANCTUARY_PLACEMENT_ERROR_NOTIFICATION } from '@common/constants/edition/edition.constants';
import { CELL_SIZE_LARGE, CELL_SIZE_MEDIUM, CELL_SIZE_SMALL } from '@common/constants/game-grid/game-grid.constants';
import { GridSize, ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { ObjectInterface, TileInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { GameMap } from '@common/interfaces/game-frontend/game-interface';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-case-game-edition',
    imports: [],
    templateUrl: './case-game-edition.component.html',
    styleUrl: './case-game-edition.component.scss',
    providers: [],
})
export class CaseGameEditionComponent implements OnInit, OnDestroy {
    @ViewChild('gridImageContainer') gridContainer: ElementRef<HTMLElement>;

    readonly gridGameSize = input<GridSize>(GridSize.SMALL);
    readonly tileChoice = input<WritableSignal<TileInterface | null>>(null as unknown as WritableSignal<TileInterface | null>);
    readonly objectChoice = input<WritableSignal<ObjectInterface | null>>(null as unknown as WritableSignal<ObjectInterface | null>);
    readonly isEdit = input<boolean>(false);
    readonly gameMap = input<WritableSignal<GameMap>>(null as unknown as WritableSignal<GameMap>);

    readonly updateObject = output<ObjectInterface>();
    readonly imageSource = output<string>();
    readonly saveAllInformation = output<boolean>();
    readonly isGameMapModified = output<boolean>();
    readonly isRestartModified = output<boolean>();
    readonly placementError = output<string>();
    readonly objectPlaced = output<void>();

    cases: number[];
    gridStyle: string = '';
    copyGameMap: GameMap;
    hoveredCellIndex: number | null = null;
    readonly showSanctuaryOverwriteModal = signal(false);

    private pendingSanctuaryOverwrite: { caseId: number } | null = null;
    private readonly subscriptions: Subscription[] = [];

    constructor(
        private readonly mouseService: MouseService,
        readonly editionTool: EditionTool,
        private readonly saveRestartService: SaveRestartSignalService,
        private readonly editionService: EditionService,
    ) {}

    ngOnInit(): void {
        this.setupGrid();
        this.subscriptions.push(
            this.saveRestartService.saveSignal.subscribe(() => {
                setTimeout(() => this.sendGameOnClick(), 0);
            }),
            this.saveRestartService.restartSignal.subscribe(() => {
                if (!this.isEdit()) {
                    this.setNewGameMap();
                } else {
                    this.gameMap()?.set(structuredClone(this.copyGameMap));
                }
                this.isRestartModified.emit(true);
            }),
        );
        this.copyGameMap = structuredClone(this.currentMap);
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    }

    get gridSize(): GridSize {
        return this.currentMap.gridSize;
    }

    getTileImage(index: number): string {
        const { x, y } = this.editionService.getIndex(index, this.gridGameSize());
        return this.currentMap.grid[x][y].tile.imageSrc;
    }

    getObjectImageSrc(index: number): string | null {
        const { x, y } = this.editionService.getIndex(index, this.gridGameSize());
        const object = this.currentMap.grid[x][y].objects;
        if (!object || object.objectType === ObjectType.DEFAULT) return null;
        return object.imageSrc ?? null;
    }

    isCellSanctuary(index: number): boolean {
        const { x, y } = this.editionService.getIndex(index, this.gridGameSize());
        return isSanctuary(this.currentMap.grid[x][y].objects);
    }

    getObjectDescription(index: number): string {
        const { x, y } = this.editionService.getIndex(index, this.gridGameSize());
        const object = this.currentMap.grid[x][y].objects;
        if (!object || object.objectType === ObjectType.DEFAULT) return '';
        const description = object.description?.trim();
        if (description) return description;
        return this.getDefaultObjectDescription(object.objectType);
    }

    onCellMouseEnter(index: number): void {
        this.hoveredCellIndex = this.getObjectDescription(index) ? index : null;
    }

    onCellMouseLeave(): void {
        this.hoveredCellIndex = null;
    }

    addClick(event: MouseEvent, caseId: number): void {
        if (this.mouseService.verifyLeftMouseButtonClick(event)) {
            this.handlePlacement(caseId);
        }
        event.preventDefault();
    }

    addDeleteMaintained(event: MouseEvent, caseId: number): void {
        if (this.mouseService.verifyLeftMouseButtonMaintained(event)) {
            this.handlePlacement(caseId);
        } else if (this.mouseService.verifyRightMouseButton(event)) {
            this.delete(event, caseId);
        }
        event.preventDefault();
    }

    delete(event: MouseEvent, caseId: number): void {
        if (this.mouseService.verifyRightMouseButton(event)) {
            this.handleDeletion(caseId);
        }
        event.preventDefault();
    }

    confirmSanctuaryOverwrite(): void {
        if (!this.pendingSanctuaryOverwrite) return;
        const { caseId } = this.pendingSanctuaryOverwrite;
        const { x, y } = this.editionService.getIndex(caseId, this.gridGameSize());
        const removedObject = this.editionService.confirmSanctuaryTileOverwrite(this.gameMap(), this.selectedTile, x, y);
        if (removedObject) this.updateObject.emit(removedObject);
        this.objectPlaced.emit();
        this.pendingSanctuaryOverwrite = null;
        this.showSanctuaryOverwriteModal.set(false);
    }

    cancelSanctuaryOverwrite(): void {
        this.pendingSanctuaryOverwrite = null;
        this.showSanctuaryOverwriteModal.set(false);
    }

    private get currentMap(): GameMap {
        return this.gameMap()();
    }

    private get selectedTile(): TileInterface | null {
        return this.tileChoice()();
    }

    private get selectedObject(): ObjectInterface | null {
        return this.objectChoice()();
    }

    private setupGrid(): void {
        const cellSizeByGridSize: Record<GridSize, string> = {
            [GridSize.LARGE]: CELL_SIZE_LARGE,
            [GridSize.MEDIUM]: CELL_SIZE_MEDIUM,
            [GridSize.SMALL]: CELL_SIZE_SMALL,
        };
        this.gridStyle = cellSizeByGridSize[this.gridGameSize()];
        this.cases = Array.from({ length: this.gridGameSize() * this.gridGameSize() }, (_, index) => index);
    }

    private async sendGameOnClick(): Promise<void> {
        try {
            const isMapChanged = !areMapsEqual(this.currentMap, this.copyGameMap);
            if (this.isEdit()) {
                this.isGameMapModified.emit(isMapChanged);
                this.saveAllInformation.emit(true);
                return;
            }
            const newImageUrl = await this.editionService.captureAndCreateUrl(this.gridContainer);
            this.imageSource.emit(newImageUrl);
            this.saveAllInformation.emit(true);
        } catch {
            this.saveRestartService.finishSaving();
            this.saveAllInformation.emit(false);
        }
    }

    private setNewGameMap(): void {
        this.gameMap()?.set(this.editionService.createEmptyGrid(this.gridGameSize()));
    }

    private getDefaultObjectDescription(objectType: ObjectType): string {
        const descriptionByType: Partial<Record<ObjectType, string>> = {
            [ObjectType.FLAG]: this.editionTool.createFlagObject(0).description ?? '',
            [ObjectType.COMBAT_SANCTUARY]: this.editionTool.createSanctuaryObjectCombat(0).description ?? '',
            [ObjectType.HEAL_SANCTUARY]: this.editionTool.createSanctuaryObjectSante(0).description ?? '',
            [ObjectType.START_POINT]: this.editionTool.createStartingPointObject(0).description ?? '',
        };
        return descriptionByType[objectType] ?? '';
    }

    private handlePlacement(caseId: number): void {
        if (this.selectedObject && !this.selectedTile) {
            this.handleObjectPlacement(caseId);
        } else if (this.selectedTile && !this.selectedObject) {
            this.handleTilePlacement(caseId);
        }
    }

    private handleTilePlacement(caseId: number): void {
        if (!this.selectedTile) return;
        const { x, y } = this.editionService.getIndex(caseId, this.gridGameSize());
        const result = this.editionService.handleTilePlacement(this.gameMap(), this.selectedTile, x, y);
        if (result.requiresSanctuaryOverwrite) {
            this.pendingSanctuaryOverwrite = { caseId };
            this.showSanctuaryOverwriteModal.set(true);
            return;
        }
        if (result.placed) {
            if (result.removedObject) this.updateObject.emit(result.removedObject);
            this.objectPlaced.emit();
        }
    }

    private handleObjectPlacement(caseId: number): void {
        if (!this.selectedObject) return;
        const { x, y } = this.editionService.getIndex(caseId, this.gridGameSize());
        if (this.selectedObject.objectType === ObjectType.COMBAT_SANCTUARY || this.selectedObject.objectType === ObjectType.HEAL_SANCTUARY) {
            const sanctuaryResult = this.editionService.handleSanctuaryPlacement(this.gameMap(), this.selectedObject, x, y);
            if (sanctuaryResult.hasError) this.placementError.emit(SANCTUARY_PLACEMENT_ERROR_NOTIFICATION);
            if (sanctuaryResult.placed) {
                this.updateQuantityObject();
                this.objectPlaced.emit();
            }
            return;
        }
        const result = this.editionService.handleObjectPlacement(this.gameMap(), this.selectedObject, x, y);
        if (result.blockedByTile) this.placementError.emit(OBJECT_ON_BLOCKING_TILE_ERROR);
        if (result.placed) {
            if (result.replacedObject) this.updateObject.emit(result.replacedObject);
            this.updateQuantityObject();
            this.objectPlaced.emit();
        }
    }

    private handleDeletion(caseId: number): void {
        const { x, y } = this.editionService.getIndex(caseId, this.gridGameSize());
        const isObjectExist = verifyObjectExist(this.currentMap.grid[x][y]);
        if (isObjectExist) {
            const removedObject = this.editionService.removeObjectFromCell(this.gameMap(), x, y);
            if (removedObject) this.updateObject.emit(removedObject);
            this.objectPlaced.emit();
        } else {
            this.editionService.removeTileFromCell(this.gameMap(), x, y);
        }
    }

    private updateQuantityObject(): void {
        this.objectChoice()?.update((object) => {
            if (object && object.quantity) {
                object.quantity--;
            }
            return object;
        });
    }
}
