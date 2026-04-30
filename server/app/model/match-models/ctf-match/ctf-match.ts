import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { Match } from '@app/model/match-models/base-match/match';
import { PlayerService } from '@app/services/match/player/player.service';
import { VirtualPlayerContext } from '@app/services/match/virtual-player/context/virtual-player-context';
import {
    CTFAggressiveVirtualPlayerBehavior,
    CTFDefensiveVirtualPlayerBehavior,
} from '@app/services/match/virtual-player/ctf/ctf-virtual-player-behavior';
import { VirtualTurnManager } from '@app/services/match/virtual-player/virtual-player-turn-manager';
import { LogVirtualPlayerService } from '@app/services/virtual-log/virtual-log.service';
import { PLAYER_ABANDONED_FLAG } from '@common/constants/game-view/game-view.constants';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameEndStatsPayload } from '@common/interfaces/game-end/game-end-stats-payload.interface';
import { ObjectInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { FlagDroppedPayload, FlagPickedUpPayload } from '@common/interfaces/game-play/flag/flag.interface';
import {
    GameOverPayload,
    MoveRequestPayload,
    RequestAttackPayload,
} from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { BotProfile } from '@common/interfaces/types';
import { MatchEvents } from '@common/socket_event/match/match.gateway.events';

export class CTFMatch extends Match {
    pendingTransfer: { requesterId: string; targetId: string } | null = null;
    flagHolderId: string | null = null;
    flagPosition: Position | null = null;
    private flagObjectTemplate: ObjectInterface | null = null;
    private flagHolders: Set<string> = new Set();

    constructor(data: GameState, broadCast: BroadcastService, playerService: PlayerService, logService: LogVirtualPlayerService) {
        super(data, broadCast, playerService, logService);
        this.flagPosition = this.findFlagPosition();
    }

    protected override startVirtualPlayerTurn(player: Player): void {
        const behavior = player.botProfile === BotProfile.AGGRESSIVE
            ? new CTFAggressiveVirtualPlayerBehavior()
            : new CTFDefensiveVirtualPlayerBehavior();
        const context = new VirtualPlayerContext(player, this);
        new VirtualTurnManager(behavior, context).executeTurn().catch(() => this.forceEndTurn());
    }

    private findFlagPosition(): Position | null {
        const grid = this.gameState.grid;
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x].objects?.objectType === ObjectType.FLAG) {
                    this.flagObjectTemplate = { ...grid[y][x].objects } as ObjectInterface;
                    return { x, y };
                }
            }
        }
        return null;
    }

    protected override canCloseDoor(position: Position): boolean {
        if (!super.canCloseDoor(position)) return false;
        if (!this.flagPosition) return true;
        return !(this.flagPosition.x === position.x && this.flagPosition.y === position.y);
    }

    protected override onCombatOver(
        winnerId: string | null,
        loserId: string | null,
        loserDefeatPosition: Position | null,
        drawDefeatPositions?: Map<string, Position>,
    ): void {
        if (loserId && loserDefeatPosition) {
            const loser = this.gameState.players.find(player => player.id === loserId);
            if (loser?.hasFlag) this.dropFlag(loser, loserDefeatPosition);
        } else if (drawDefeatPositions) {
            for (const [playerId, defeatPosition] of drawDefeatPositions) {
                const player = this.gameState.players.find(p => p.id === playerId);
                if (player?.hasFlag) this.dropFlag(player, defeatPosition);
            }
        }
        super.onCombatOver(winnerId, loserId, loserDefeatPosition, drawDefeatPositions);
    }

    override requestMove(playerId: string, moveRequest: MoveRequestPayload): void {
        super.requestMove(playerId, moveRequest);
        const player = this.gameState.players.find((foundPlayer) => foundPlayer.id === playerId);
        if (!player) return;

        if (!this.flagHolderId && this.flagPosition) {
            const playerIsOnFlag = player.position.x === this.flagPosition.x && player.position.y === this.flagPosition.y;
            if (playerIsOnFlag) {
                this.pickUpFlag(player);
            }
        }

        const ctfWinner = this.checkWinCondition();
        if (ctfWinner) {
            this.endCTFGame(ctfWinner);
            return;
        }

        if (player.hasFlag) this.notifyWrongStartPointIfNeeded(player);

    }

    private notifyWrongStartPointIfNeeded(player: Player): void {
        const cell = this.gameState.grid[player.position.y]?.[player.position.x];
        if (cell?.objects?.objectType !== ObjectType.START_POINT) return;
        const isOwnStartPoint = player.startPosition
            && player.position.x === player.startPosition.x
            && player.position.y === player.startPosition.y;
        if (isOwnStartPoint) return;
        const playerSocket = this.getSocketForPlayer(player.id ?? '');
        if (playerSocket) {
            this.broadCast.emitToSocket(playerSocket, MatchEvents.WrongStartPoint);
        }
    }

    override checkWinCondition(): Player | undefined {
        if (!this.flagHolderId) return undefined;
        const flagHolder = this.gameState.players.find((player) => player.id === this.flagHolderId);
        if (!flagHolder?.startPosition) return undefined;
        const isAtStartPosition = flagHolder.position.x === flagHolder.startPosition.x
            && flagHolder.position.y === flagHolder.startPosition.y;
        return isAtStartPosition ? flagHolder : undefined;
    }

    trackFlagHolder(playerId: string | undefined): void {
        if (playerId) this.flagHolders.add(playerId);
    }

    private pickUpFlag(player: Player): void {
        player.hasFlag = true;
        this.flagHolderId = player.id;
        this.flagHolders.add(player.id);
        const cell = this.gameState.grid[player.position.y]?.[player.position.x];
        if (cell) cell.objects = undefined;
        this.flagPosition = null;
        const payload: FlagPickedUpPayload = { playerId: player.id, position: player.position };
        this.broadCast.emitToRoom(this.gameState.roomId, MatchEvents.FlagPickedUp, payload);
        const activePlayer = super.getPlayer(this.flagHolderId);
        if (activePlayer.isVirtual) this.virtualLogService.sendVirtualFlagPicked(activePlayer.roomId, activePlayer.name);
    }

    private dropFlag(player: Player, defeatPosition: Position): void {
        player.hasFlag = false;
        this.flagHolderId = null;
        const dropPos = this.findNearestFlagDropPosition(defeatPosition);
        this.flagPosition = dropPos;
        const cell = this.gameState.grid[dropPos.y]?.[dropPos.x];
        if (cell) cell.objects = this.flagObjectTemplate;
        const payload: FlagDroppedPayload = { playerId: player.id, position: dropPos };
        this.broadCast.emitToRoom(this.gameState.roomId, MatchEvents.FlagDropped, payload);
    }

    private findNearestFlagDropPosition(origin: Position): Position {
        const gridSize = this.gameState.gridSize;
        const candidates: { position: Position; distance: number }[] = [];

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const distance = Math.abs(x - origin.x) + Math.abs(y - origin.y);
                candidates.push({ position: { x, y }, distance });
            }
        }

        candidates.sort((cellA, cellB) => cellA.distance - cellB.distance);

        for (const candidate of candidates) {
            if (this.isValidFlagDropCell(candidate.position)) return candidate.position;
        }

        return origin;
    }

    private isValidFlagDropCell(pos: Position): boolean {
        const cell = this.gameState.grid[pos.y]?.[pos.x];
        if (!cell) return false;
        const tile = cell.tile.tileType;
        if (tile === TileType.WALL || tile === TileType.DOOR_CLOSED || tile === TileType.DOOR_OPEN) return false;
        if (cell.objects && cell.objects.objectType !== ObjectType.DEFAULT) return false;
        if (this.services.pathFinding.isOccupiedByPlayer(pos, '', this.gameState.players)) return false;
        return true;
    }

    override abandonPlayer(state: GameState, playerId: string): Player | undefined {
        const player = super.abandonPlayer(state, playerId);
        if (!player) return undefined;
        if (player.hasFlag) {
            this.dropFlag(player, player.position);
        }
        if (player.team && this.isTeamEliminated(player.team)) {
            this.cancelGame();
        }
        return player;
    }

    private isTeamEliminated(team: string): boolean {
        return !this.gameState.players.some(
            (player) => player.team === team && player.remainingActions !== PLAYER_ABANDONED_FLAG,
        );
    }

    private buildCTFStats(): GameEndStatsPayload {
        const stats = this.buildStats(true);
        stats.differentFlagHoldersCount = this.flagHolders.size;
        return stats;
    }

    override cancelGame(): void {
        this.gameCancelled = true;
        const payload: GameOverPayload = {
            winnerId: '',
            winnerName: '',
            cancelled: true,
            stats: this.buildCTFStats(),
        };
        this.broadCast.emitToRoom(this.gameState.roomId, MatchEvents.GameOver, payload);
        this.stopTimer();
    }

    endCTFGame(winner: Player): void {
        const payload: GameOverPayload = {
            winnerId: winner.id,
            winnerName: winner.name,
            winnerTeam: winner.team,
            stats: this.buildCTFStats(),
        };
        this.broadCast.emitToRoom(this.gameState.roomId, MatchEvents.GameOver, payload);
        this._isGameEnd = true;
        this.stopTimer();
    }

    override endTurn(playerId: string): void {
        this.cancelPendingTransfer();
        super.endTurn(playerId);
    }

    override forceEndTurn(): void {
        this.cancelPendingTransfer();
        super.forceEndTurn();
    }

    private cancelPendingTransfer(): void {
        if (!this.pendingTransfer) return;
        const requesterSocket = this.getSocketForPlayer(this.pendingTransfer.requesterId);
        const targetSocket = this.getSocketForPlayer(this.pendingTransfer.targetId);
        if (requesterSocket) {
            this.broadCast.emitToSocket(requesterSocket, MatchEvents.FlagTransferCancelled, { isRequester: true });
        }
        if (targetSocket) {
            this.broadCast.emitToSocket(targetSocket, MatchEvents.FlagTransferCancelled, { isRequester: false });
        }
        this.pendingTransfer = null;
    }

    override hasNoAvailableActions(player: Player): boolean {
        const reachable = this.computeReachableCells(player);
        const hasReachableCells = reachable.some(pos => pos.x !== player.position.x || pos.y !== player.position.y);
        const adjacentPlayers = this.services.pathFinding.getAdjacentPlayers(player, this.gameState);
        const hasAdjacentEnemy = player.remainingActions > 0 && adjacentPlayers.some(p => !p.team || !player.team || p.team !== player.team);
        const hasAdjacentSanctuary = player.remainingActions > 0 &&
            this.services.sanctuary.findAdjacentActiveSanctuaries(player, this.gameState, this.sanctuaryReactivationTurns).length > 0;
        const hasAdjacentDoor = player.remainingActions > 0 && this.services.pathFinding.isAdjacentToClosedDoor(player.position, this.gameState);
        return !hasReachableCells && !hasAdjacentEnemy && !hasAdjacentSanctuary && !hasAdjacentDoor;
    }

    override requestCombat(initiatorId: string, payload: RequestAttackPayload): void {
        const initiator = this.gameState.players.find((player) => player.id === initiatorId);
        const target = this.gameState.players.find((player) => player.id === payload.targetPlayerId);
        if (initiator?.team && target?.team && initiator.team === target.team) return;
        super.requestCombat(initiatorId, payload);
    }

    getPlayerIdForSocket(socketId: string): string | undefined {
        return this.gameState.socketToPlayerId.get(socketId);
    }

}
