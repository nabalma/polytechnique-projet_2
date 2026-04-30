import { Component, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BackButtonComponent } from '@app/components/common-component/back-button/back-button.component';
import { BackgroundImageComponent } from '@app/components/common-component/background-image/background-image.component';
import { PanelBackgroundComponent } from '@app/components/common-component/panel-background/panel-background.component';
import { ButtonCenterComponent } from '@app/components/edition/center-edition/button-center/button-center.component';
import { CaseGameEditionComponent } from '@app/components/edition/center-edition/case-game-edition/case-game-edition.component';
import { GameInfoPanelComponent } from '@app/components/edition/left-edition/game-info-panel/game-info-panel.component';
import { EditionToolComponent } from '@app/components/edition/right-edition/edition-tools/edition-tools.component';
import { ObjectToolsComponent } from '@app/components/edition/right-edition/object-tools/object-tools.component';
import { SaveStatusPopupComponent } from '@app/components/edition/save-status-popup/save-status-popup.component';
import { NotificationPopupComponent } from '@app/components/initial-view/notification-popup/notification-popup.component';
import { EditionTool } from '@app/services/edition-tools/edition-tool';
import { EditionService } from '@app/services/edition/edition-service/edition.service';
import {
    countObjectsInGrid,
    extractErrors,
    isGameNameOrDescriptionMissing,
    partialGameInterface,
    syncSelectedObjectReference,
    updateObjectsByGridSize,
} from '@app/services/edition/edition-service/utils/edition-page.utils';
import { SaveRestartSignalService } from '@app/services/edition/save-restart-service/save-restart.service';
import { DEFAULT_QUANTITY, FLAG_QUANTITY, SET_TIMEOUT } from '@common/constants/edition/edition.constants';
import { GridSize, ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { SaveStatus } from '@common/enum/save-status/save-status';
import { ObjectInterface, TileInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { GameInterface, GameMap } from '@common/interfaces/game-frontend/game-interface';

import { Subject, takeUntil } from 'rxjs';


@Component({
    selector: 'app-edition-page',
    imports: [
        BackButtonComponent,
        CaseGameEditionComponent,
        EditionToolComponent,
        ObjectToolsComponent,
        GameInfoPanelComponent,
        ButtonCenterComponent,
        SaveStatusPopupComponent,
        BackgroundImageComponent,
        PanelBackgroundComponent,
        NotificationPopupComponent,
    ],

    templateUrl: './edition-page.component.html',
    styleUrl: './edition-page.component.scss',
    providers: [],
})
export class EditionPageComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    id: string | null = null;

    game: GameInterface;

    gameMap: WritableSignal<GameMap> = signal(this.editionService.createEmptyGrid());

    tileSelected: WritableSignal<TileInterface | null> = signal(null);
    tileHovered: WritableSignal<TileInterface | null> = signal(null);
    objectSelected: WritableSignal<ObjectInterface | null> = signal(null);
    objectHovered: WritableSignal<ObjectInterface | null> = signal(null);

    isEdit: WritableSignal<boolean> = signal(false);

    saveAttempted = false;
    isSaveCaseGameEdition: WritableSignal<boolean> = signal(false);
    isLoading: WritableSignal<boolean> = signal(true);
    isGameMapModified = false;
    copyGameName = '';
    copyGameDescription = '';

    wall: TileInterface;
    door: TileInterface;
    ice: TileInterface;
    water: TileInterface;

    flag: WritableSignal<ObjectInterface> = signal(this.editionTool.createDefaultObject());
    sanctuaryCombat: WritableSignal<ObjectInterface> = signal(this.editionTool.createDefaultObject());
    sanctuarySante: WritableSignal<ObjectInterface> = signal(this.editionTool.createDefaultObject());
    startingPoint: WritableSignal<ObjectInterface> = signal(this.editionTool.createDefaultObject());

    isSavePopupVisible = false;
    savePopupStatus: SaveStatus = SaveStatus.Loading;

    saveErrors: string[] = [];

    placementErrorMessage: string | null = null;

    constructor(
        private editionTool: EditionTool,
        private route: ActivatedRoute,
        private saveRestartService: SaveRestartSignalService,
        private editionService: EditionService,
        private navigateRoute: Router,
    ) {
        this.wall = this.editionTool.createWallTile();
        this.door = this.editionTool.createDoorTileClosed();
        this.ice = this.editionTool.createIceTile();
        this.water = this.editionTool.createWaterTile();
        this.initializeGame();
    }

    initializeGame() {
        this.game = {
            name: '',
            description: '',
            mode: GameMode.CLASSIC,
            grid: this.editionService.createEmptyGrid(),
            imageUrl: '',
            isVisible: false,
            createdAt: new Date(),
            updateAt: new Date(),
        };
    }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id');

        if (this.id) {
            this.loadGameModeAndSize();
        } else {
            this.selectionNewGameMode();
            this.selectionNewGameSize();
            this.switchStateGridSize();
            this.isLoading.set(false);
        }

        this.subscribeSave();
        this.subscribeSaveLifecycle();
    }

    onTileHover(tile: TileInterface): void {
        this.tileHovered.set(tile);
    }

    onTileLeave(): void {
        this.tileHovered.set(null);
    }

    onObjectHover(object: WritableSignal<ObjectInterface>): void {
        this.objectHovered.set(object());
    }

    onObjectLeave(): void {
        this.objectHovered.set(null);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    subscribeSave() {
        this.saveRestartService.saveAttemptSignal.pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.saveAttempted = true;
        });
    }

    subscribeSaveLifecycle() {
        this.saveRestartService.saveSignal.pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.startLoadingSaveState();
        });
    }

    switchStateGridSize(
        numberFlag: number = DEFAULT_QUANTITY,
        numberSanctuaryTotal: number = DEFAULT_QUANTITY,
        numberStartingPoint: number = DEFAULT_QUANTITY,
    ) {
        this.flag.set(this.editionTool.createFlagObject(FLAG_QUANTITY - numberFlag));
        updateObjectsByGridSize({
            gridSize: this.game.grid.gridSize,
            numberSanctuaryTotal,
            numberStartingPoint,
            editionTool: this.editionTool,
            sanctuaryCombat: this.sanctuaryCombat,
            sanctuarySante: this.sanctuarySante,
            startingPoint: this.startingPoint,
        });

        this.objectSelected.set(
            syncSelectedObjectReference(this.objectSelected(), this.flag(), this.sanctuaryCombat(), this.sanctuarySante(), this.startingPoint()),
        );
    }

    selectionNewGameMode() {
        const gameModeRoute = this.route.snapshot.queryParamMap.get('mode');
        if (gameModeRoute === GameMode.CLASSIC) {
            this.game.mode = GameMode.CLASSIC;
        } else {
            this.game.mode = GameMode.CTF;
        }
    }

    selectionNewGameSize() {
        const gameSize = Number(this.route.snapshot.queryParamMap.get('size'));

        if (gameSize === GridSize.SMALL) {
            this.game.grid.gridSize = GridSize.SMALL;
        } else if (gameSize === GridSize.MEDIUM) {
            this.game.grid.gridSize = GridSize.MEDIUM;
        } else {
            this.game.grid.gridSize = GridSize.LARGE;
        }

        this.gameMap.set(this.editionService.createEmptyGrid(this.game.grid.gridSize));
    }

    async loadGameModeAndSize() {
        if (this.id) {
            this.game = await this.editionService.getGameById(this.id);
            this.copyGameName = structuredClone(this.game.name);
            this.copyGameDescription = structuredClone(this.game.description);
            this.gameMap.set(this.game.grid);
            this.countObject();
            this.isEdit.set(true);
            this.isLoading.set(false);
        }
    }

    onNameChange(name: string): void {
        this.game.name = name;
    }

    onDescriptionChange(description: string): void {
        this.game.description = description;
    }

    selectTile(tile: TileInterface) {
        if (this.tileSelected()?.tileType === tile.tileType) {
            this.tileSelected.set(null);
        } else {
            this.tileSelected.set(tile);
            this.objectSelected.set(null);
        }
    }

    selectObject(object: WritableSignal<ObjectInterface>) {
        if (this.objectSelected()?.objectType === object().objectType) {
            this.objectSelected.set(null);
        } else {
            this.objectSelected.set(object());
            this.tileSelected.set(null);
        }
    }

    clearSelection() {
        this.tileSelected.set(null);
        this.objectSelected.set(null);
    }

    countObject() {
        const currentMap = this.gameMap();
        const { numberFlag, numberSanctuaryTotal, numberStartingPoint } = countObjectsInGrid(currentMap);
        this.switchStateGridSize(numberFlag, numberSanctuaryTotal, numberStartingPoint);
    }

    updateQuantityDuringAdding(object: ObjectInterface) {
        if (object.objectType === ObjectType.FLAG) {
            this.flag.update((obj) => ({ ...obj, quantity: (obj.quantity ?? 0) + 1 }));
        } else if (object.objectType === ObjectType.START_POINT) {
            this.startingPoint.update((obj) => ({ ...obj, quantity: (obj.quantity ?? 0) + 1 }));
        } else if (object.objectType === ObjectType.COMBAT_SANCTUARY || object.objectType === ObjectType.HEAL_SANCTUARY) {
            this.sanctuaryCombat.update((obj) => ({ ...obj, quantity: (obj.quantity ?? 0) + 1 }));
            this.sanctuarySante.update((obj) => ({ ...obj, quantity: (obj.quantity ?? 0) + 1 }));
        }
        this.objectSelected.set(
            syncSelectedObjectReference(this.objectSelected(), this.flag(), this.sanctuaryCombat(), this.sanctuarySante(), this.startingPoint()),
        );
    }

    saveOnClick(imageUrl: string) {
        this.game.imageUrl = imageUrl;
    }

    async changeStateIsSaveGameMap(isSave: boolean) {
        if (this.shouldAbortSave(isSave)) return;

        if (!this.hasChanges) {
            this.savePopupStatus = SaveStatus.NoChanges;
            this.saveRestartService.finishSaving();
            return;
        }

        try {
            await this.saveGameMap();
            this.saveAttempted = false;
            this.savePopupStatus = SaveStatus.Success;
            setTimeout(() => this.navigateRoute.navigate(['/administration']), SET_TIMEOUT);
        } catch (error: unknown) {
            await this.handleSaveError(error);
        } finally {
            this.saveRestartService.finishSaving();
        }
    }

    private shouldAbortSave(isSave: boolean): boolean {
        if (isGameNameOrDescriptionMissing(this.game)) {
            this.isSavePopupVisible = false;
            this.saveRestartService.finishSaving();
            return true;
        }

        this.isSaveCaseGameEdition.set(isSave);
        if (this.isSaveCaseGameEdition()) return false;

        this.savePopupStatus = SaveStatus.Error;
        this.saveErrors = ['Erreur lors de la capture ou du televersement de la carte.'];
        this.saveRestartService.finishSaving();
        return true;
    }

    private startLoadingSaveState() {
        this.isSavePopupVisible = true;
        this.savePopupStatus = SaveStatus.Loading;
        this.saveErrors = [];
    }

    private async saveGameMap(): Promise<void> {
        this.game.grid = this.gameMap();
        await this.chooseRouteSaveMap();
    }

    private async handleSaveError(error: unknown): Promise<void> {
        this.saveErrors = extractErrors(error);
        if (!(await this.updateEditingGameAfterDeleting())) {
            this.savePopupStatus = SaveStatus.Error;
        } else {
            this.savePopupStatus = SaveStatus.Success;
            setTimeout(() => this.navigateRoute.navigate(['/administration']), SET_TIMEOUT);
        }
    }

    async chooseRouteSaveMap() {
        if (this.isEdit() && this.id) {
            if (!this.isGameMapModified && this.copyGameName !== this.game.name) {
                await this.editionService.updateGame(this.id, this.game);
            } else {
                await this.editionService.updateGame(this.id, partialGameInterface(this.game, this.gameMap()));
            }
        } else {
            await this.editionService.addGame(this.game);
        }
    }

    async updateEditingGameAfterDeleting(): Promise<boolean> {
        const responseErrorUpdate = 'game non trouvé';
        if (this.saveErrors?.includes(responseErrorUpdate)) {
            await this.editionService.addGame(this.game);
            return true;
        }
        return false;
    }

    restartGame(isToRestart: boolean) {
        if (isToRestart) {
            this.countObject();
        }
    }

    editingGameMap(isModified: boolean) {
        this.isGameMapModified = isModified;
    }

    get hasChanges(): boolean {
        if (!this.isEdit()) return true;
        return this.isGameMapModified || this.game.name !== this.copyGameName || this.game.description !== this.copyGameDescription;
    }

    closeSavePopup(): void {
        this.isSavePopupVisible = false;
    }

    onQuitConfirmed(): void {
        this.navigateRoute.navigate(['/administration']);
    }

    showPlacementError(message: string): void {
        this.placementErrorMessage = message;
    }

    closePlacementError(): void {
        this.placementErrorMessage = null;
    }

    get remainingSanctuaryTotal(): number {
        return this.sanctuaryCombat().quantity ?? 0;
    }
}
