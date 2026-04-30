import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { MatchInternalServices } from '@app/model/match-models/base-match/match-internal-services';
import { CombatOrchestrator } from '@app/model/match-models/combat/combat-orcherstrator';
import { Timer } from '@app/model/match-models/timer/timer';
import { PlayerService } from '@app/services/match/player/player.service';
import { TurnCoordinator, TurnCoordinatorCallbacks, TurnCoordinatorServices } from '@app/services/match/turn-coordinator';
import { LogVirtualPlayerService } from '@app/services/virtual-log/virtual-log.service';
import { TileType } from '@common/enum/game/grid/game-grid.enum';
import { Posture } from '@common/enum/match/match.enum';
import { GameEndStatsPayload } from '@common/interfaces/game-end/game-end-stats-payload.interface';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import {
    DebugModeToggledPayload,
    GameOverPayload,
    GameStatePayload,
    MoveRequestPayload,
    RequestAttackPayload,
    RequestSanctuaryInteractionPayload,
} from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { StatsContext } from '@common/interfaces/statistics/statistics-interface';
import { MatchEvents, TimerEvents } from '@common/socket_event/match/match.gateway.events';

export abstract class Match {
    gameState: GameState;
    timer: Timer;

    protected _isGameEnd: boolean = false;
    protected gameStartTime: number = 0;
    protected gameCancelled = false;
    sanctuaryReactivationTurns: Map<string, number> = new Map();
    protected readonly services: MatchInternalServices = new MatchInternalServices();

    private hasStartedFlag = false;
    private readonly terrainCellCount: number;
    private readonly doorCount: number;
    private readonly sanctuaryCount: number;
    protected readonly combat: CombatOrchestrator;
    private readonly turnCoordinator: TurnCoordinator;

    constructor(
        data: GameState,
        protected broadCast: BroadcastService,
        protected playerService: PlayerService,
        protected virtualLogService: LogVirtualPlayerService,
    ) {
        this.gameState = data;
        this.timer = new Timer(this.onTick);
        this.terrainCellCount = this.services.gameStats.computeTerrainCellCount(data.grid);
        this.doorCount = this.services.gameStats.computeDoorCount(data.grid);
        this.sanctuaryCount = this.services.gameStats.computeSanctuaryCount(data.grid);
        this.combat = new CombatOrchestrator(
            this.gameState,
            this.broadCast,
            this.services.movement,
            this.onCombatOver.bind(this),
        );
        this.turnCoordinator = this.buildTurnCoordinator();
    }

    private buildTurnCoordinator(): TurnCoordinator {
        const services: TurnCoordinatorServices = {
            broadCast: this.broadCast,
            sanctuaryService: this.services.sanctuary,
            virtualLogService: this.virtualLogService,
        };
        const callbacks: TurnCoordinatorCallbacks = {
            isGameCancelled: () => this.gameCancelled,
            hasNoAvailableActions: (player) => this.hasNoAvailableActions(player),
            onForceEndTurn: () => this.forceEndTurn(),
            onStartVirtualPlayerTurn: (player) => this.startVirtualPlayerTurn(player),
        };
        return new TurnCoordinator(this.gameState, this.timer, this.sanctuaryReactivationTurns, services, callbacks);
    }

    get isGameEnd(): boolean {
        return this._isGameEnd;
    }

    get combatOrchestrator(): CombatOrchestrator {
        return this.combat;
    }

    get hasStarted(): boolean {
        return this.hasStartedFlag;
    }

    get isGameCancelled(): boolean {
        return this.gameCancelled;
    }

    get activePlayerId(): string {
        return this.gameState.turnOrder[this.gameState.activePlayerIndex];
    }

    get currentPlayerId(): string {
        return this.gameState.players[this.gameState.activePlayerIndex]?.id;
    }

    get statePayload(): GameStatePayload | null {
        if (!this.gameState) return null;
        return {
            players: this.gameState.players,
            activePlayerIndex: this.gameState.activePlayerIndex,
            grid: this.gameState.grid,
            turnNumber: this.gameState.turnNumber,
        };
    }

    protected startVirtualPlayerTurn(player: Player): void {
        void player;
    }

    startMatch(): void {
        if (this.hasStartedFlag) return;
        this.hasStartedFlag = true;
        this.gameStartTime = Date.now();
        this.turnCoordinator.beginMatch();
        this._isGameEnd = false;
    }

    cancelGame(): void {
        this.gameCancelled = true;
        this._isGameEnd = true;
        this.broadCast.emitToRoom(this.gameState.roomId, MatchEvents.GameOver, {
            winnerId: '', winnerName: '', cancelled: true, stats: this.buildStats(false),
        } as GameOverPayload);
        this.stopTimer();
    }

    stopTimer(): void {
        this.timer.stop();
    }

    isActivePlayer(playerId: string): boolean {
        return this.activePlayerId === playerId;
    }

    isGameOver(): boolean {
        return this.getActivePlayers().length <= 1;
    }

    getActivePlayers(): Player[] {
        return this.gameState.players.filter((player) => player.remainingActions !== -1);
    }

    getPlayer(id: string): Player | undefined {
        return this.gameState.players.find((player) => player.id === id);
    }

    computeReachableCells(player: Player): Position[] {
        return this.services.pathFinding.computeReachableCells(player, this.gameState);
    }

    teleportPlayer(playerId: string, target: Position): boolean {
        return this.services.movement.teleportPlayer(playerId, target, this.gameState);
    }

    getSocketForPlayer(playerId: string): string | undefined {
        for (const [socketId, mappedPlayerId] of this.gameState.socketToPlayerId.entries()) {
            if (mappedPlayerId === playerId) return socketId;
        }
        return undefined;
    }

    endTurn(playerId: string): void {
        if (this.isActivePlayer(playerId) || (this.gameState.organizerId === playerId && this.gameState.isDebugMode)) {
            this.getActivePlayer().isActive = false;
            this.timer.stop();
        }
        this.turnCoordinator.handleTransition();
    }

    forceEndTurn(): void {
        const current = this.getActivePlayer();
        if (current) current.isActive = false;
        this.timer.stop();
        this.turnCoordinator.handleTransition();
    }

    hasNoAvailableActions(player: Player): boolean {
        const reachable = this.computeReachableCells(player);
        const hasReachableCells = reachable.some(pos => pos.x !== player.position.x || pos.y !== player.position.y);
        const hasAdjacentEnemy = player.remainingActions > 0 && this.services.pathFinding.getAdjacentPlayers(player, this.gameState).length > 0;
        const hasAdjacentSanctuary = player.remainingActions > 0 &&
            this.services.sanctuary.findAdjacentActiveSanctuaries(player, this.gameState, this.sanctuaryReactivationTurns).length > 0;
        const hasAdjacentDoor = player.remainingActions > 0 && this.services.pathFinding.isAdjacentToClosedDoor(player.position, this.gameState);
        return !hasReachableCells && !hasAdjacentEnemy && !hasAdjacentSanctuary && !hasAdjacentDoor;
    }

    requestMove(playerId: string, moveRequest: MoveRequestPayload): void {
        if (!this.isActivePlayer(playerId) || this.turnCoordinator.isTransitioning || this.combat.isInCombat) return;
        const activePlayer = this.getActivePlayer();
        const result = this.services.movement.movePlayer(playerId, moveRequest.targetPosition, this.gameState);
        if (!result.success) return;
        this.services.gameStats.trackVisit(playerId, moveRequest.targetPosition);
        this.broadCast.emitPlayerMoved(this.gameState.roomId, activePlayer, moveRequest.targetPosition);
        this.broadCast.emitReachableCells(
            this.getSocketForPlayer(activePlayer.id) ?? '',
            this.computeReachableCells(activePlayer),
        );
        if (this.hasNoAvailableActions(activePlayer)) this.forceEndTurn();
    }

    requestReachable(playerId: string): void {
        const player = this.getActivePlayer();
        if (!player) return;
        this.broadCast.emitReachableCells(playerId, this.computeReachableCells(player));
    }

    requestCombat(initiatorId: string, payload: RequestAttackPayload): void {
        if (!this.isActivePlayer(initiatorId)) return;
        const activePlayer = this.getActivePlayer();
        if (activePlayer.isVirtual) {
            const targetPlayerName = this.getPlayer(payload.targetPlayerId).name;
            this.virtualLogService.sendVirtualStartFight(activePlayer.roomId, activePlayer.name, targetPlayerName);
        }
        this.timer.pause();
        this.combat.requestCombat(initiatorId, payload);
    }

    choosePosture(playerId: string, posture: Posture): void {
        this.combat.choosePosture(playerId, posture);
    }

    requestToggleDoor(socketId: string, position: Position): void {
        const context = this.services.door.buildDoorToggleContext(
            socketId, position, this.gameState,
            { activePlayerId: this.activePlayerId, transitioning: this.turnCoordinator.isTransitioning, isInCombat: this.combat.isInCombat },
            this.services.pathFinding,
        );
        if (!context) return;
        const { playerId, activePlayer } = context;
        const cell = this.gameState.grid[position.y]?.[position.x];
        if (cell?.tile?.tileType === TileType.DOOR_OPEN && !this.canCloseDoor(position)) return;
        if (!this.toggleDoor(this.gameState, position)) return;
        activePlayer.remainingActions--;
        this.broadCast.emitDoorToggled(this.gameState.roomId, playerId, position, cell.tile.tileType === TileType.DOOR_OPEN);
        const playerSocket = this.getSocketForPlayer(playerId);
        if (playerSocket) this.broadCast.emitReachableCells(playerSocket, this.computeReachableCells(activePlayer));
        if (activePlayer.isVirtual) this.virtualLogService.sendVirtualDoorAction(activePlayer.roomId, activePlayer.name);
        if (this.hasNoAvailableActions(activePlayer)) this.forceEndTurn();
    }

    requestSanctuaryInteraction(playerId: string, payload: RequestSanctuaryInteractionPayload): void {
        if (!this.isActivePlayer(playerId) || this.turnCoordinator.isTransitioning || this.combat.isInCombat) return;
        const result = this.services.sanctuary.validateAndApplySanctuaryInteraction(
            playerId, payload, this.gameState, this.sanctuaryReactivationTurns,
        );
        if (!result) return;
        this.services.gameStats.trackSanctuaryUsed(result.sanctuaryAnchorPosition);
        this.broadCast.emitToRoom(this.gameState.roomId, MatchEvents.SanctuaryInteractionResult, result);
        const activePlayer = this.getActivePlayer();
        if (activePlayer.isVirtual) this.virtualLogService.sendVirtualSanctuaryAction(activePlayer.roomId, activePlayer.name, result.sanctuaryType);
        if (activePlayer && this.hasNoAvailableActions(activePlayer)) this.forceEndTurn();
    }

    toggleDebug(playerId: string): void {
        if (this.gameState.organizerId !== playerId) return;
        this.gameState.isDebugMode = !this.gameState.isDebugMode;
        this.broadCast.emitToRoom(this.gameState.roomId, MatchEvents.DebugModeToggled, {
            isDebugMode: this.gameState.isDebugMode,
        } as DebugModeToggledPayload);
    }

    abandonPlayer(state: GameState, playerId: string): Player | undefined {
        return this.playerService.abandonPlayer(state, playerId);
    }

    checkWinCondition(): Player | undefined {
        return;
    }

    toggleDoor(state: GameState, position: Position): boolean {
        if (!this.services.door.toggleDoor(state, position)) return false;
        this.services.gameStats.trackDoorToggled(position);
        return true;
    }
    /**
     * la différence dans le maximum de ligne est insignifiant pour pouvoir scinder 
     * la logique du onCombatOver
     */

    /* eslint-disable max-lines-per-function */
    protected onCombatOver(
        winnerId: string | null, loserId: string | null,
        _loserDefeatPosition: Position | null,
        drawDefeatPositions?: Map<string, Position>,
    ): void {
        let participantIds: string[] = [];
        if (winnerId && loserId) {
            participantIds = [winnerId, loserId];
        } else if (drawDefeatPositions) {
            participantIds = [...drawDefeatPositions.keys()];
        }
        this.services.gameStats.trackCombatResult(winnerId, loserId, participantIds, this.gameState);
        const activePlayer = this.getActivePlayer();
        if (activePlayer && this.hasNoAvailableActions(activePlayer)) {
            this.timer.stop();
            this.turnCoordinator.advanceToNextPlayer();
        } else {
            this.timer.resume();
            if (activePlayer) {
                const socketId = this.getSocketForPlayer(activePlayer.id);
                if (socketId) this.broadCast.emitReachableCells(socketId, this.computeReachableCells(activePlayer));
            }
        }
    }

    protected endGame(winner: Player): void {
        this.broadCast.emitToRoom(this.gameState.roomId, MatchEvents.GameOver, {
            winnerId: winner.id,
            winnerName: winner.name,
            stats: this.buildStats(false),
        } as GameOverPayload);
        this._isGameEnd = true;
        this.stopTimer();
    }

    protected buildStats(isCTFMode: boolean): GameEndStatsPayload {
        const context: StatsContext = {
            isCTFMode,
            players: this.gameState.players,
            terrainCellCount: this.terrainCellCount,
            doorCount: this.doorCount,
            sanctuaryCount: this.sanctuaryCount,
            gameStartTime: this.gameStartTime,
            turnNumber: this.gameState.turnNumber,
        };
        return this.services.gameStats.buildStats(context);
    }

    protected canCloseDoor(position: Position): boolean {
        return this.services.door.canCloseDoor(position, this.gameState);
    }

    private onTick = (seconds: number): void => {
        this.broadCast.emitToRoom(this.gameState.roomId, TimerEvents.Tick, { seconds });
    };

    private getActivePlayer(): Player | undefined {
        return this.gameState.players.find(player => player.id === this.activePlayerId);
    }
}
