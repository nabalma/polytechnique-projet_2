import { SORT_RANDOM_PIVOT } from '@app/constants/game-play.constants';
import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { ClassicMatch } from '@app/model/match-models/classic-match/classique-match';

import { Match } from '@app/model/match-models/base-match/match';
import { CTFMatch } from '@app/model/match-models/ctf-match/ctf-match';
import { PlayerService } from '@app/services/match/player/player.service';
import { LogVirtualPlayerService } from '@app/services/virtual-log/virtual-log.service';
import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { Posture } from '@common/enum/match/match.enum';
import { CellInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import {
    MoveRequestPayload,
    RequestAttackPayload,
    RequestSanctuaryInteractionPayload, RequestToggleDoorPayload,
} from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { CreateMatchParams, Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { WaitingRoomEvents } from '@common/socket_event/waiting-room/waiting-room.gateway.events';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MatchService {
    private readonly socketGame = new Map<string, string>();
    matches: Map<string, Match> = new Map();
    constructor(
        private playerService: PlayerService,
        private broadcastService: BroadcastService,
        private logVirtual: LogVirtualPlayerService,
    ) {}

    async createMatch(payload: CreateMatchParams, _mode: GameMode = GameMode.CLASSIC) {
        const completeData = this.createGame(payload);
        const newMatch =
            payload.gameMode === GameMode.CTF
                ? new CTFMatch(completeData, this.broadcastService, this.playerService, this.logVirtual)
                : new ClassicMatch(completeData, this.broadcastService, this.playerService, this.logVirtual);
        if (completeData) {
            this.matches.set(payload.roomId, newMatch);
            const data = newMatch.statePayload;
            this.broadcastService.emitToRoom(completeData.roomId, WaitingRoomEvents.GameStarted, data);
            newMatch.startMatch();
        }
    }

    /* eslint-disable max-lines-per-function -- On désactive cette règle parce que cette fonction construit un objet GameState avec plusieurs attributs obligatoires, ce qui augmente naturellement sa longueur. */
    createGame(payload: CreateMatchParams): GameState {
        const grid = this.cloneGrid(payload.gameMap.grid);
        const assignedPlayers = this.assignStartPositions(payload.players, grid);
        const turnOrder = this.determineTurnOrder(assignedPlayers);
        const state: GameState = {
            ...payload,
            isDebugMode: false,
            players: assignedPlayers,
            grid,
            gridSize: payload.gameMap.gridSize,
            turnOrder,
            activePlayerIndex: 0,
            turnNumber: 0,
            socketToPlayerId: new Map(payload.socketToPlayerId),
        };

        this.removeUnusedStartPoints(state);
        for (const socketId of payload.socketToPlayerId.keys()) {
            this.socketGame.set(socketId, payload.roomId);
        }
        return state;
    }

    private removeUnusedStartPoints(state: GameState): void {
        const usedPositions = new Set(state.players.map((player) => `${player.startPosition.x},${player.startPosition.y}`));
        for (let y = 0; y < state.grid.length; y++) {
            for (let x = 0; x < state.grid[y].length; x++) {
                const cell = state.grid[y][x];
                if (cell.objects?.objectType === ObjectType.START_POINT && !usedPositions.has(`${x},${y}`)) {
                    cell.objects = undefined;
                }
            }
        }
    }
    private cloneGrid(grid: CellInterface[][]): CellInterface[][] {
        return grid.map((row) => row.map((cell) => ({ tile: { ...cell.tile }, objects: cell.objects ? { ...cell.objects } : undefined })));
    }

    private determineTurnOrder(players: Player[]): string[] {
        const sorted = [...players].sort((playerA, playerB) => {
            const diff = playerB.attributes.speed - playerA.attributes.speed;
            if (diff !== 0) return diff;
            return Math.random() - SORT_RANDOM_PIVOT;
        });
        return sorted.map((player) => player.id);
    }

    private assignStartPositions(players: Player[], grid: CellInterface[][]): Player[] {
        const startPoints: Position[] = [];
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x].objects?.objectType === ObjectType.START_POINT) {
                    startPoints.push({ x, y });
                }
            }
        }

        if (startPoints.length < players.length) return [];

        for (let i = startPoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [startPoints[i], startPoints[j]] = [startPoints[j], startPoints[i]];
        }
        const newPlayers = players.map((player) => {
            const startPosition: Position = startPoints.pop();
            return {
                ...player,
                position: { x: startPosition.x, y: startPosition.y },
                startPosition: { x: startPosition.x, y: startPosition.y },
                wins: 0,
                remainingMovement: player.attributes.speed,
                remainingActions: 1,
                isActive: false,
            };
        });
        return newPlayers;
    }

    getGameForSocket(socketId: string): Match | undefined {
        const roomId = this.socketGame.get(socketId);
        return roomId ? this.matches.get(roomId) : undefined;
    }

    removeSocketMapping(socketId: string): void {
        this.socketGame.delete(socketId);
    }

    getPlayerIdForSocket(state: GameState, socketId: string): string | undefined {
        return state.socketToPlayerId.get(socketId);
    }

    getSocketForPlayer(state: GameState, playerId: string): string | undefined {
        for (const [socketId, mappedPlayerId] of state.socketToPlayerId.entries()) {
            if (mappedPlayerId === playerId) return socketId;
        }
        return undefined;
    }

    endTurn(playerId: string) {
        const match = this.getGameForSocket(playerId);
        if (match) match.endTurn(playerId);
    }

    forceTurnEnd(playerId: string) {
        const match = this.getGameForSocket(playerId);
        match.forceEndTurn();
    }

    requestMove(playerId: string, moveRequest: MoveRequestPayload) {
        const match = this.getGameForSocket(playerId);
        if (match) match.requestMove(playerId, moveRequest);
    }

    startTimer(organizerId: string) {
        const match = this.getGameForSocket(organizerId);
        if (match && !match.hasStarted) match.startMatch();
    }
    requestReachable(playerId: string) {
        const match = this.getGameForSocket(playerId);
        if (match) match.requestReachable(playerId);
    }
    toggleDebug(playerId: string) {
        const match = this.getGameForSocket(playerId);
        if (match) match.toggleDebug(playerId);
    }

    requestAttack(playerId: string, payload: RequestAttackPayload) {
        const match = this.getGameForSocket(playerId);
        if (match) match.requestCombat(playerId, payload);
    }

    requestSanctuaryInteraction(socketId: string, payload: RequestSanctuaryInteractionPayload): void {
        const match = this.getGameForSocket(socketId);
        if (match) match.requestSanctuaryInteraction(socketId, payload);
    }

    requestToggleDoor(socketId: string, payload: RequestToggleDoorPayload): void {
        const match = this.getGameForSocket(socketId);
        if (match) match.requestToggleDoor(socketId, payload.position);
    }

    choosePosture(playerId: string, posture: Posture) {
        const match = this.getGameForSocket(playerId);
        if (match) match.choosePosture(playerId, posture);
    }

}
