import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { Match } from '@app/model/match-models/base-match/match';
import { MatchService } from '@app/services/match/match-session/match.service';
import { Posture } from '@common/enum/match/match.enum';
import {
    DebugModeToggledPayload,
    MoveRequestPayload,
    PlayerAbandonedPayload,
    RequestAttackPayload,
    RequestSanctuaryInteractionPayload,
    RequestTeleportPayload,
    RequestToggleDoorPayload,
} from '@common/interfaces/game-play/game-play-payloads-interfaces';

import { Namespaces } from '@common/routes/namespaces';
import { MatchEvents } from '@common/socket_event/match/match.gateway.events';
import { Injectable } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: Namespaces.Match,
})
@Injectable()
export class MatchGateway implements OnGatewayDisconnect {
    @WebSocketServer() private server: Server;

    constructor(
        private readonly matchService: MatchService,
        private readonly broadcast: BroadcastService,
    ) {}

    @SubscribeMessage(MatchEvents.ChoosePosture)
    onRequestPosture(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: { posture: Posture }) {
        this.matchService.choosePosture(socket.id, payload?.posture);
    }

    @SubscribeMessage(MatchEvents.RequestMove)
    onRequestMove(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: MoveRequestPayload): void {
        this.matchService.requestMove(socket.id, payload);
    }

    @SubscribeMessage(MatchEvents.EndTurn)
    onEndTurn(@ConnectedSocket() socket: Socket): void {
        this.matchService.endTurn(socket.id);
    }

    @SubscribeMessage(MatchEvents.RequestAttack)
    onRequestAttack(socket: Socket, payload: RequestAttackPayload): void {
        this.matchService.requestAttack(socket.id, payload);
    }

    @SubscribeMessage(MatchEvents.RequestSanctuaryInteraction)
    onRequestSanctuaryInteraction(socket: Socket, payload: RequestSanctuaryInteractionPayload): void {
        this.matchService.requestSanctuaryInteraction(socket.id, payload);
    }

    @SubscribeMessage(MatchEvents.RequestToggleDoor)
    onRequestToggleDoor(socket: Socket, payload: RequestToggleDoorPayload): void {
        this.matchService.requestToggleDoor(socket.id, payload);
    }

    @SubscribeMessage(MatchEvents.RequestReachables)
    onReachable(@ConnectedSocket() socket: Socket) {
        this.matchService.requestReachable(socket.id);
    }

    @SubscribeMessage(MatchEvents.ToggleDebugMode)
    onToggleDebugMode(socket: Socket): void {
        this.matchService.toggleDebug(socket.id);
    }

    @SubscribeMessage(MatchEvents.RequestTeleport)
    onRequestTeleport(socket: Socket, payload: RequestTeleportPayload): void {
        const match = this.matchService.getGameForSocket(socket.id);
        if (!match?.gameState.isDebugMode) return;
        const playerId = this.matchService.getPlayerIdForSocket(match.gameState, socket.id);
        if (!playerId || match.activePlayerId !== playerId) return;
        if (!match.teleportPlayer(playerId, payload.targetPosition)) return;
        const activePlayer = match.gameState.players.find((player) => player.id === playerId);
        if (!activePlayer) return;
        this.broadcast.emitPlayerMoved(match.gameState.roomId, activePlayer, payload.targetPosition);
        const reachable = match.computeReachableCells(activePlayer);
        this.broadcast.emitReachableCells(socket.id, reachable);
    }

    @SubscribeMessage(MatchEvents.DebugEndTurn)
    onDebugEndTurn(socket: Socket): void {
        const match = this.matchService.getGameForSocket(socket.id);
        if (!match?.gameState.isDebugMode) return;
        const playerId = this.matchService.getPlayerIdForSocket(match.gameState, socket.id);
        if (playerId !== match.gameState.organizerId) return;
        match.forceEndTurn();
    }

    @SubscribeMessage(MatchEvents.Abandon)
    onAbandon(socket: Socket): void {
        const match = this.matchService.getGameForSocket(socket.id);
        if (!match) return;
        const playerId = this.matchService.getPlayerIdForSocket(match.gameState, socket.id);
        if (!playerId) return;
        if (match.gameState.isDebugMode && playerId === match.gameState.organizerId) {
            match.gameState.isDebugMode = false;
            this.broadcast.emitToRoom(match.gameState.roomId, MatchEvents.DebugModeToggled, { isDebugMode: false } as DebugModeToggledPayload);
        }
        this.matchService.removeSocketMapping(socket.id);
        socket.leave(match.gameState.roomId);
        this.processPlayerAbandon(match, playerId);
    }

    private processPlayerAbandon(match: Match, playerId: string): void {
        const wasActive = match.activePlayerId === playerId;
        const player = match.abandonPlayer(match.gameState, playerId);
        if (!player) return;
        this.server.to(match.gameState.roomId).emit(MatchEvents.PlayerAbandoned, {
            playerId,
            playerName: player.name,
            updatedGrid: match.gameState.grid,
        } as PlayerAbandonedPayload);
        if (match.isGameCancelled) return;
        if (match.isGameOver()) {
            match.cancelGame();
        } else if (wasActive) {
            match.forceEndTurn();
        }
    }

    handleDisconnect(socket: Socket): void {
        const match = this.matchService.getGameForSocket(socket.id);
        if (!match) return;
        const playerId = this.matchService.getPlayerIdForSocket(match.gameState, socket.id);
        if (!playerId) return;
        if (match.gameState.isDebugMode && playerId === match.gameState.organizerId) {
            match.gameState.isDebugMode = false;
            this.broadcast.emitToRoom(match.gameState.roomId, MatchEvents.DebugModeToggled, { isDebugMode: false } as DebugModeToggledPayload);
        }
        this.matchService.removeSocketMapping(socket.id);
        this.processPlayerAbandon(match, playerId);
    }
}
