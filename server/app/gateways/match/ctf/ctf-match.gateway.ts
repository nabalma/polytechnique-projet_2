import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { CTFMatch } from '@app/model/match-models/ctf-match/ctf-match';
import { MatchCTFService } from '@app/services/match/ctf/match-ctf.service';
import { MatchService } from '@app/services/match/match-session/match.service';
import { FlagTransferResponsePayload, RequestFlagTransferPayload } from '@common/interfaces/game-play/flag/flag.interface';
import { ActionConsumedPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Namespaces } from '@common/routes/namespaces';
import { MatchEvents } from '@common/socket_event/match/match.gateway.events';
import { Injectable } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: Namespaces.Match,
})
@Injectable()
export class CTFMatchGateway {
    constructor(
        private readonly matchService: MatchService,
        private readonly matchCTFService: MatchCTFService,
        private readonly broadcast: BroadcastService,
    ) {}

    @SubscribeMessage(MatchEvents.RequestFlagTransfer)
    onRequestFlagTransfer(socket: Socket, payload: RequestFlagTransferPayload): void {
        const match = this.matchService.getGameForSocket(socket.id);
        if (!(match instanceof CTFMatch)) return;
        const requesterId = match.getPlayerIdForSocket(socket.id);
        if (!requesterId || !match.isActivePlayer(requesterId)) return;
        const result = this.matchCTFService.requestFlagTransfer(requesterId, payload.targetPlayerId, match);
        if (!result.valid) return;
        this.broadcast.emitToRoom(match.gameState.roomId, MatchEvents.ActionConsumed, {
            playerId: requesterId,
            remainingActions: result.remainingActions,
        } as ActionConsumedPayload);
        const target = match.gameState.players.find((player) => player.id === payload.targetPlayerId);
        const requester = match.gameState.players.find((player) => player.id === requesterId);
        if (target?.isVirtual) {
            this.emitAutoFlagTransfer(match, payload.targetPlayerId);
            return;
        }
        this.emitFlagTransferRequest(match, requesterId, payload.targetPlayerId, requester?.name ?? '');
    }

    private emitAutoFlagTransfer(match: CTFMatch, targetPlayerId: string): void {
        const autoResult = this.matchCTFService.respondFlagTransfer(targetPlayerId, true, match);
        if (autoResult.success) {
            this.broadcast.emitToRoom(match.gameState.roomId, MatchEvents.FlagTransferred, {
                fromPlayerId: autoResult.fromId,
                toPlayerId: autoResult.toId,
            });
        }
    }

    private emitFlagTransferRequest(match: CTFMatch, requesterId: string, targetPlayerId: string, requesterName: string): void {
        const targetSocket = match.getSocketForPlayer(targetPlayerId);
        if (targetSocket) {
            this.broadcast.emitToSocket(targetSocket, MatchEvents.FlagTransferRequest, {
                requesterId,
                requesterName,
            });
        }
    }

    @SubscribeMessage(MatchEvents.FlagTransferResponse)
    onFlagTransferResponse(socket: Socket, payload: FlagTransferResponsePayload): void {
        const match = this.matchService.getGameForSocket(socket.id);
        if (!(match instanceof CTFMatch)) return;

        const responderId = match.getPlayerIdForSocket(socket.id);
        if (!responderId) return;

        const requesterId = match.pendingTransfer?.requesterId;
        const result = this.matchCTFService.respondFlagTransfer(responderId, payload.accepted, match);

        if (!result.success) {
            if (!payload.accepted && requesterId) {
                this.notifyFlagTransferDeclined(match, requesterId);
            }
            return;
        }

        this.broadcast.emitToRoom(match.gameState.roomId, MatchEvents.FlagTransferred, {
            fromPlayerId: result.fromId,
            toPlayerId: result.toId,
        });
    }

    private notifyFlagTransferDeclined(match: CTFMatch, requesterId: string): void {
        const requesterSocket = match.getSocketForPlayer(requesterId);
        if (requesterSocket) {
            this.broadcast.emitToSocket(requesterSocket, MatchEvents.FlagTransferDeclined, {});
        }
    }
}
