import { Component, effect, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { BackgroundImageComponent } from '@app/components/common-component/background-image/background-image.component';
import { DebugOverlayComponent } from '@app/components/common-component/debug-overlay/debug-overlay.component';
import { GameGridComponent } from '@app/components/common-component/game-grid/game-grid.component';
import { AbandonConfirmPopupComponent } from '@app/components/game-view/abandon-confirm-popup/abandon-confirm-popup.component';
import { CombatViewComponent } from '@app/components/game-view/combat-view/combat-view.component';
import { FlagTransferPopupComponent } from '@app/components/game-view/flag-transfer-popup/flag-transfer-popup.component';
import { FlagTransferSelectorComponent } from '@app/components/game-view/flag-transfer-selector/flag-transfer-selector.component';
import { GameInfoPanelComponent } from '@app/components/game-view/game-info/game-info.component';
import { GameNotificationComponent } from '@app/components/game-view/game-notification/game-notification.component';
import { GameOverPopupComponent } from '@app/components/game-view/game-over-popup/game-over-popup.component';
import { GameRulesModalComponent } from '@app/components/game-view/game-rules-modal/game-rules-modal.component';
import { MessageZoneComponent } from '@app/components/game-view/message-zone/message-zone.component';
import { PlayerStatsPanelComponent } from '@app/components/game-view/player-stats-panel/player-stats-panel.component';
import { MatchPlayerListComponent } from '@app/components/game-view/players-list/players-list.component';
import { SanctuaryModalComponent } from '@app/components/game-view/sanctuary-modal/sanctuary-modal.component';
import { TileInfoPopupComponent } from '@app/components/game-view/tile-info-popup/tile-info-popup.component';
import { GameViewFacadeService } from '@app/services/game-view/game-view-facade.service';
import { TilePopupService } from '@app/services/game-view/tile-popup.service';
import { SanctuaryInteractionService } from '@app/services/match/action/sanctuary-interaction.service';
import { FlagTransferService } from '@app/services/match/flag/flag-transfer.service';
import { MapService } from '@app/services/match/map/map.service';
import { MatchService } from '@app/services/match/match.service';
import { WaitingRoomStateService } from '@app/services/waiting-room/room-state/waiting-room-state.service';
import { DEBUG_TOGGLE_KEY } from '@common/constants/game-view/debug-mode.constants';
import { GAME_ABANDONED_NOTIFICATION } from '@common/constants/game-view/game-over.constants';
import { CellInterface, CellRightClickPayload } from '@common/interfaces/game-frontend/game-grid-interface';
import { InitialViewNavState } from '@common/interfaces/navigation/navigation-state-interfaces';
import { Player } from '@common/interfaces/player/player-interface';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-view-page',
    standalone: true,
    imports: [
        BackgroundImageComponent,
        PlayerStatsPanelComponent,
        GameInfoPanelComponent,
        MatchPlayerListComponent,
        GameGridComponent,
        MessageZoneComponent,
        DebugOverlayComponent,
        GameNotificationComponent,
        FlagTransferPopupComponent,
        FlagTransferSelectorComponent,
        GameOverPopupComponent,
        TileInfoPopupComponent,
        CombatViewComponent,
        SanctuaryModalComponent,
        CombatViewComponent,
        AbandonConfirmPopupComponent,
        GameRulesModalComponent,
    ],
    templateUrl: './game-view-page.component.html',
    styleUrls: ['./game-view-page.component.scss'],
    providers: [TilePopupService],
})
export class GameViewPageComponent implements OnInit, OnDestroy {
    readonly matchService = inject(MatchService);
    readonly flagTransferService = inject(FlagTransferService);
    readonly sanctuaryService = inject(SanctuaryInteractionService);
    readonly stateService = inject(WaitingRoomStateService);
    readonly mapService = inject(MapService);
    private readonly tilePopupService = inject(TilePopupService);
    private readonly router = inject(Router);
    private readonly facade = inject(GameViewFacadeService);

    private isRefresh = false;
    private routerSub = Subscription.EMPTY;

    showAbandonConfirm = false;
    showRulesPanel = false;

    get tilePopupVisible(): boolean {
        return this.tilePopupService.visible;
    }
    get tilePopupX(): number {
        return this.tilePopupService.x;
    }
    get tilePopupY(): number {
        return this.tilePopupService.y;
    }
    get tilePopupPlayer(): Player | null {
        return this.tilePopupService.player;
    }
    get tilePopupCell(): CellInterface | null {
        return this.tilePopupService.cell;
    }

    get timerLabel(): string {
        return this.facade.timerLabel;
    }
    get timerDisplay(): string {
        return this.facade.timerDisplay;
    }
    get isTimerLow(): boolean {
        return this.facade.isTimerLow;
    }

    constructor() {
        effect(() => this.onGameOver());
    }

    private onGameOver(): void {
        const data = this.matchService.gameOverData();
        if (!data) return;
        this.facade.handleGameOver(data, this.gameId, this.playerName, this.matchService.players());
    }

    @HostListener('window:beforeunload')
    handleBeforeUnload(): void {
        if (!this.matchService.hasAbandoned) {
            this.facade.sendLeaveRoom(this.gameId);
            this.matchService.abandon();
        }
    }

    handleRefresh(): void {
        const isRefreshed = performance.getEntriesByType('navigation')
            .map(nav => (nav as PerformanceNavigationTiming).type)
            .includes('reload');

        if (isRefreshed && !this.mapService.gameMap) {
            this.isRefresh = true;
            this.router.navigate(['/home'], { state: { notification: GAME_ABANDONED_NOTIFICATION } as InitialViewNavState });
        }
    }

    @HostListener('document:keydown', ['$event'])
    handleKeyboard(event: KeyboardEvent): void {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    }

    @HostListener('document:keyup', ['$event'])
    handleKeyUp(event: KeyboardEvent): void {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (this.facade.isChatFocused) return;
        if (event.key.toLowerCase() === DEBUG_TOGGLE_KEY && this.matchService.isOrganizer) {
            this.matchService.toggleDebugMode();
            return;
        }
        this.facade.handleMovement(event.key);
    }

    ngOnInit(): void {
        this.routerSub = this.router.events.subscribe((event) => {
            if (event instanceof NavigationStart && event.navigationTrigger === 'popstate') {
                this.router.navigate(['/home'], { state: { notification: GAME_ABANDONED_NOTIFICATION } as InitialViewNavState });
            }
        });
        this.matchService.currentPlayerId = this.stateService.currentPlayerId();
        this.handleRefresh();
        if (!this.isRefresh) {
            this.matchService.connectLog();
            this.matchService.registerListeners();
            this.facade.registerCombatListeners();
            this.sanctuaryService.registerListeners();
        }
    }

    ngOnDestroy(): void {
        this.facade.resetCombatState();
        this.routerSub.unsubscribe();
        if (this.isRefresh) return;
        const gameEnded = !!this.matchService.gameOverData();
        this.matchService.abandon();
        if (!gameEnded) {
            this.facade.resetChat();
        }
        this.matchService.disconnectLog();
        this.facade.sendLeaveRoom(this.gameId);
    }

    get gameId(): string {
        return this.stateService.roomId() || '';
    }

    get playerName(): string {
        return this.stateService.currentPlayer()?.name ?? '';
    }

    get organizerId(): string {
        return this.stateService.organizerId();
    }

    get maxPlayers(): number {
        return this.stateService.maxPlayers();
    }

    get gamePlayers(): Player[] {
        return Array.from(this.matchService.players().values());
    }

    get ctfStartFlatIndex(): number | null {
        const currentPlayerId = this.stateService.currentPlayerId();
        const currentPlayer = this.matchService.players().get(currentPlayerId);
        if (!currentPlayer?.team || !currentPlayer.startPosition) return null;
        const gridSize = this.mapService.gridSize;
        return currentPlayer.startPosition.y * gridSize + currentPlayer.startPosition.x;
    }

    get currentPlayerHasFlag(): boolean {
        const currentPlayerId = this.stateService.currentPlayerId();
        return this.matchService.players().get(currentPlayerId)?.hasFlag ?? false;
    }

    get isCurrentPlayerInCombat(): boolean {
        return this.facade.isLocalPlayerInCombat();
    }

    onEndTurn(): void {
        this.matchService.endTurn();
    }

    onAbandon(): void {
        this.showAbandonConfirm = true;
    }

    onAbandonConfirmed(): void {
        this.showAbandonConfirm = false;
        this.matchService.abandon();
        this.router.navigate(['/home'], { state: { notification: GAME_ABANDONED_NOTIFICATION } as InitialViewNavState });
    }

    onAbandonCancelled(): void {
        this.showAbandonConfirm = false;
    }

    onCellClick(flatIndex: number): void {
        this.facade.handleCellClick(flatIndex);
    }

    onAcceptTransfer(): void {
        this.matchService.respondFlagTransfer(true);
    }

    onRefuseTransfer(): void {
        this.matchService.respondFlagTransfer(false);
    }

    onGameOverClosed(): void {
        this.facade.onGameOverClosed(this.matchService.gameOverData());
    }

    onCellRightClick(payload: CellRightClickPayload): void {
        if (this.matchService.isDebugMode && this.matchService.isMyTurn()) {
            this.facade.requestTeleport(payload.position);
            return;
        }
        const player = payload.playerId ? (this.matchService.players().get(payload.playerId) ?? null) : null;
        this.tilePopupService.open(payload, player);
    }

    closeTilePopup(): void {
        this.tilePopupService.close();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const clickedInside = (event.target as HTMLElement).closest('.grid-container');
        this.tilePopupService.close();
        if (!clickedInside) {
            this.matchService.selectedCell = null;
        }
    }

    onAction(): void {
        this.matchService.onAction();
        this.facade.startCombat();
    }
}