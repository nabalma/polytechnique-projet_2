import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { LogService } from '@app/services/logs/logs.service';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import { DOOR_CLOSED_IMAGE_SRC, DOOR_OPEN_IMAGE_SRC } from '@common/constants/game-grid/game-grid.constants';
import {
    ABANDON_CLASSIC,
    ABANDON_ENEMY_CTF,
    ABANDON_TEAMMATE_ALONE,
    ABANDON_TEAMMATE_MULTIPLE,
    PLAYER_ABANDONED_FLAG,
} from '@common/constants/game-view/game-view.constants';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameLogEntry } from '@common/interfaces/game-log/game-log-entry.interface';
import { Observable, Subscription } from 'rxjs';

import {
    FlagDroppedPayload, FlagPickedUpPayload,
    FlagTransferredPayload, FlagTransferRequestPayload,
} from '@common/interfaces/game-play/flag/flag.interface';
import {
    ActionConsumedPayload,
    DebugModeToggledPayload,
    DoorToggledPayload,
    GameOverPayload,
    GameStatePayload,
    PlayerAbandonedPayload,
    PlayerMovedPayload,
    ReachableCellsPayload,
    TransitionPayload,
} from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { LogsEvent } from '@common/socket_event/logs/logs.gateway.events';
import { MatchEvents, TimerEvents } from '@common/socket_event/match/match.gateway.events';
import { MapService } from './map/map.service';
import { MatchTurnService } from './match-turn/match-turn.service';
import { GameNotificationService } from './notification/match-notification.service';
import { MatchPlayerService } from './player/match-player.service';

@Injectable({
    providedIn: 'root',
})
export class MatchService {
    reachableCells: WritableSignal<Position[]> = signal([]);
    pendingTransferRequest: WritableSignal<FlagTransferRequestPayload | null> = signal(null);
    gameOverData: WritableSignal<GameOverPayload | null> = signal(null);
    hasAbandoned: boolean = false;
    private _actionMode = signal<boolean>(false);
    private _selectedCell: WritableSignal<number | null> = signal(null);
    private isInitialized: boolean = false;
    private subscriptions: Subscription[] = [];
    private notifications = inject(GameNotificationService);

    constructor(
        private playersService: MatchPlayerService,
        private turnService: MatchTurnService,
        private mapService: MapService,
        private socketService: MatchSocketService,
        private logService: LogService,
    ) {}

    get players(): WritableSignal<Map<string, Player>> {
        return this.playersService.players;
    }
    get playerInfo(): Player | undefined {
        return this.playersService.playerInfo;
    }
    get currentPlayer(): Player | null {
        return this.playersService.currentPlayer;
    }
    get activePlayerName(): string {
        return this.playersService.activePlayerName;
    }
    get activePlayerId(): string {
        return this.playersService.activePlayerId;
    }
    get remainingMovement(): number {
        return this.playersService.remainingMovement;
    }
    get isOrganizer(): boolean {
        return this.playersService.isOrganizer;
    }
    get isDebugMode(): boolean {
        return this.playersService.isDebugMode;
    }
    get currentPos(): Position | undefined {
        return this.playersService.currentPos;
    }

    get currentPlayerId(): string {
        return this.playersService.currentPlayerId;
    }

    set currentPlayerId(id: string) {
        this.playersService.currentPlayerId = id;
    }

    getPlayerName(): string {
        return this.playersService.getPlayerName();
    }
    getPlayerCount(): number {
        return this.playersService.getPlayerCount();
    }
    getAvatar(playerId: string): string {
        return this.playersService.getAvatar(playerId);
    }
    getCurrentPosition(): Position | undefined {
        return this.playersService.getCurrentPosition();
    }
    getCurrentFlatPos(): number | undefined {
        return this.playersService.getCurrentFlatPos();
    }
    getPlayerRoomId(): string {
        return this.playersService.getPlayerRoomId();
    }
    isPlayerOrganizer(): boolean | undefined {
        return this.playersService.isPlayerOrganizer();
    }
    findTargetPlayer(position: Position): Player | undefined {
        return this.playersService.findTargetPlayer(position);
    }

    get isTransitioning(): boolean {
        return this.turnService.isTransitioning;

    }
    get transitioning(): boolean {
        return this.turnService.transitioning;
    }
    get canEndTurn(): boolean {
        return this.turnService.canEndTurn;
    }
    get canTakeAction(): boolean {
        return this.turnService.canTakeAction;
    }
    isMyTurn(): boolean {
        return this.turnService.isMyTurn();
    }


    get actionMode(): boolean {
        return this._actionMode();
    }
    set actionMode(value: boolean) {
        this._actionMode.set(value);
    }

    set selectedCell(index: number | null) {
        if (this.isMyTurn()) this._selectedCell.set(index);
    }
    get selectedCell(): number | null {
        return this._selectedCell();
    }


    getLogs(): WritableSignal<GameLogEntry[]> {
        return this.logService.logs;
    }
    connectLog(): void {
        this.logService.connect();
    }
    disconnectLog(): void {
        this.logService.disconnect();
    }


    reset(): void {
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
        this.subscriptions = [];
        this.gameOverData.set(null);
        this.hasAbandoned = false;
        this.isInitialized = false;
        this.playersService.setDebugMode(false);
    }

    setGameState(state: GameStatePayload): void {
        this.reset();
        this.playersService.initializePlayers(state.players);
        this.mapService.setGameMap({ gridSize: state.grid.length, grid: state.grid });
    }


    requestAttack(targetPlayerId: string | undefined): void {
        this.socketService.send(MatchEvents.RequestAttack, { targetPlayerId });
    }

    requestToggleDoor(position: Position): void {
        this.socketService.send(MatchEvents.RequestToggleDoor, { position });
    }

    endTurn(): void {
        if (!this.canEndTurn) return;
        if (this.isDebugMode && this.isOrganizer) {
            this.socketService.send(MatchEvents.DebugEndTurn);
            return;
        }
        this.socketService.send(MatchEvents.EndTurn);
    }

    abandon(): void {
        if (this.hasAbandoned) return;
        this.hasAbandoned = true;
        this.logService.sendAbandon();
        this.socketService.send(MatchEvents.Abandon);

    }

    onAction(): void {
        if (!this.canTakeAction) return;
        this.actionMode = !this.actionMode;
    }

    incrementPlayerWins(playerId: string): void {
        this.playersService.incrementPlayerWins(playerId);
    }

    requestFlagTransfer(targetPlayerId: string): void {
        this.socketService.send(MatchEvents.RequestFlagTransfer, { targetPlayerId });
    }

    respondFlagTransfer(accepted: boolean): void {
        this.socketService.send(MatchEvents.FlagTransferResponse, { accepted });
        this.pendingTransferRequest.set(null);
    }

    toggleDebugMode(): void {
        this.socketService.send(MatchEvents.ToggleDebugMode);
    }


    handleDoorToogled(data: DoorToggledPayload): void {
        const newTileType = data.isOpen ? TileType.DOOR_OPEN : TileType.DOOR_CLOSED;
        const newImageSrc = data.isOpen ? DOOR_OPEN_IMAGE_SRC : DOOR_CLOSED_IMAGE_SRC;
        this.mapService.setCellTile(data.position, { tileType: newTileType, imageSrc: newImageSrc });
        const player = this.playersService.players().get(data.playerId);
        if (player) {
            this.playersService.updatePlayerRemainingActions(data.playerId, Math.max(0, (player.remainingActions ?? 0) - 1));
        }
        if (this.isMyTurn()) this.logService.sendDoorToggle(data.isOpen);
    }

    handlePlayerAbandonned(data: PlayerAbandonedPayload): void {
        const abandonedPlayer = this.playersService.players().get(data.playerId);
        const currentPlayer = this.playersService.currentPlayer;
        const isTeammate = !!abandonedPlayer?.team && abandonedPlayer.team === currentPlayer?.team;
        this.playersService.markPlayerAbandoned(data.playerId);
        if (data.updatedGrid) this.mapService.updateGrid(data.updatedGrid);
        const team = abandonedPlayer?.team ?? '';
        const remaining = isTeammate ? this.countRemainingTeammates(team) : 0;
        this.notifications.showAbandonNotification(
            this.buildAbandonMessage(data.playerName, isTeammate, remaining, !!currentPlayer?.team),
        );
    }

    handleGameOver(data: GameOverPayload): void {
        if (this.isMyTurn()) {
            const activeNames = Array.from(this.playersService.players().values())
                .filter((player) => player.remainingActions !== PLAYER_ABANDONED_FLAG)
                .map((player) => player.name);
            this.logService.sendEndParty(activeNames);
        }
        this.gameOverData.set(data);
    }

    handleToggleDebug(payload: DebugModeToggledPayload): void {
        this.playersService.setDebugMode(payload.isDebugMode);
        if (this.isOrganizer) this.logService.sendDebugToggle(payload.isDebugMode);
    }

    handleFlagTransferRequest(payload: FlagTransferRequestPayload): void {
        this.pendingTransferRequest.set(payload);
    }

    handleFlagTransferred(payload: FlagTransferredPayload): void {
        this.playersService.transferFlag(payload.fromPlayerId, payload.toPlayerId);
        this.pendingTransferRequest.set(null);
        if (payload.fromPlayerId === this.currentPlayer?.id) {
            this.logService.sendTransferFlag(true);
        }
    }

    handleSanctuaryAction(sanctuaryType: ObjectType): void {
        if (this.isMyTurn()) this.logService.sendSanctuaryAction(sanctuaryType);
    }

    handleVirtualLog(message: string): void {
        this.logService.addVirtualLog(message);
    }

    async registerListeners(): Promise<void> {
        if (this.isInitialized) return;
        this.registerTimerEvents();
        this.registerGameEvents();
        this.registerFlagEvents();
        this.isInitialized = true;
    }

    private registerTimerEvents(): void {
        this.addSubscription(this.socketService.on<{ seconds: number }>(TimerEvents.Tick),
            (data) => this.turnService.handleTimerTick(data?.seconds));
        this.addSubscription(this.socketService.on<TransitionPayload>(TimerEvents.StartingMatch), (payload) => {
            this.actionMode = false;
            this.turnService.handleStartingMatch(payload);
        });
        this.addSubscription(this.socketService.on<TransitionPayload>(TimerEvents.StartTransition), (payload) => {
            this.actionMode = false;
            this.turnService.handleTransition(payload);
        });
        this.socketService.on<string>(LogsEvent.VirtualLog)?.subscribe((payload) => this.handleVirtualLog(payload));
        this.socketService.on<void>(TimerEvents.NextTurn)?.subscribe(() => this.turnService.handleNextTurn());
    }

    private registerGameEvents(): void {
        this.socketService.on<ReachableCellsPayload>(MatchEvents.ReachableCells)?.subscribe(
            (data) => this.reachableCells.set(data.cells),
        );
        this.socketService.on<PlayerMovedPayload>(MatchEvents.PlayerMoved)?.subscribe(
            (payload) => this.playersService.handlePlayerMoved(payload),
        );
        this.socketService.on<DoorToggledPayload>(MatchEvents.DoorToggled)?.subscribe(
            (payload) => this.handleDoorToogled(payload),
        );
        this.socketService.on<PlayerAbandonedPayload>(MatchEvents.PlayerAbandoned)?.subscribe(
            (payload) => this.handlePlayerAbandonned(payload),
        );
        this.socketService.on<GameOverPayload>(MatchEvents.GameOver)?.subscribe(
            (payload) => this.handleGameOver(payload),
        );
        this.registerDebugEvents();
    }

    private registerDebugEvents(): void {
        this.socketService.on<DebugModeToggledPayload>(MatchEvents.DebugModeToggled)?.subscribe(
            (payload) => this.handleToggleDebug(payload),
        );
        this.socketService.on<void>(MatchEvents.WrongStartPoint)?.subscribe(
            () => this.notifications.showMoveError('Ce n\'est pas votre point de départ ! Revenez au vôtre pour gagner. 🚩'),
        );
        this.socketService.on<ActionConsumedPayload>(MatchEvents.ActionConsumed)?.subscribe(
            (payload) => this.playersService.updatePlayerRemainingActions(payload.playerId, payload.remainingActions),
        );
    }

    private registerFlagEvents(): void {
        this.addSubscription(this.socketService.on<FlagPickedUpPayload>(MatchEvents.FlagPickedUp),
            (payload) => this.handleFlagPickedUp(payload));
        this.addSubscription(this.socketService.on<FlagDroppedPayload>(MatchEvents.FlagDropped),
            (payload) => this.handleFlagDropped(payload));
        this.addSubscription(this.socketService.on<FlagTransferRequestPayload>(MatchEvents.FlagTransferRequest),
            (payload) => this.handleFlagTransferRequest(payload));
        this.addSubscription(this.socketService.on<FlagTransferredPayload>(MatchEvents.FlagTransferred),
            (payload) => this.handleFlagTransferred(payload));
    }

    private addSubscription<T>(observable: Observable<T> | null, handler: (data: T) => void): void {
        const subscription = observable?.subscribe(handler);
        if (subscription) this.subscriptions.push(subscription);
    }

    private handleFlagPickedUp(payload: FlagPickedUpPayload): void {
        if (payload.playerId === this.playersService.currentPlayer?.id) this.logService.sendFlagPicked();
        this.mapService.setCellObject(payload.position, undefined);
        this.playersService.setPlayerFlag(payload.playerId, true);
    }

    private handleFlagDropped(payload: FlagDroppedPayload): void {
        this.mapService.setCellObject(payload.position, {
            objectType: ObjectType.FLAG,
            nbCells: 1,
            imageSrc: 'assets/flag.jpeg',
        });
        this.playersService.setPlayerFlag(payload.playerId, false);
    }

    private buildAbandonMessage(name: string, isTeammate: boolean, remaining: number, hasTeams: boolean): string {
        if (!hasTeams) return ABANDON_CLASSIC(name);
        if (!isTeammate) return ABANDON_ENEMY_CTF(name);
        return remaining <= 1 ? ABANDON_TEAMMATE_ALONE(name) : ABANDON_TEAMMATE_MULTIPLE(name, remaining);
    }

    private countRemainingTeammates(team: string): number {
        const currentPlayerId = this.playersService.currentPlayerId;
        return Array.from(this.playersService.players().values()).filter(
            (player) => player.team === team
                && player.id !== currentPlayerId
                && player.remainingActions !== PLAYER_ABANDONED_FLAG,
        ).length;
    }
}
