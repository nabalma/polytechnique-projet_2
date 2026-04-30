import { Injectable } from '@angular/core';
import { SocketCoreService } from '@app/services/socket/socket-core.service';
import { SocketManager } from '@app/services/socket/socket-manager/socket-manager';
import { MiniPlayerInfo } from '@common/interfaces/player/player-interface';
import {
    CreateRoomPayload,
    KickPlayerPayload,
} from '@common/interfaces/waiting-room/waiting-room-interface';
import { WaitingRoomEvents } from '@common/socket_event/waiting-room/waiting-room.gateway.events';
import { NameSpaces } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class MatchSocketService extends SocketCoreService {
    constructor(manager: SocketManager) {
        super(manager, NameSpaces.MatchNamespace);
    }
    createRoom(payload: CreateRoomPayload): void {
        this.send(WaitingRoomEvents.CreateRoom, payload);
    }

    joinRoom(player: MiniPlayerInfo, roomId: string): void {
        if (!this.socket.connected) return;
        this.send(WaitingRoomEvents.JoinRoom, { player, roomId });
    }

    kickPlayer(roomId: string, targetPlayerId: string): void {
        const payload: KickPlayerPayload = { roomId, targetPlayerId };
        this.send(WaitingRoomEvents.KickPlayer, payload);
    }

    startGame(roomId: string): void {
        this.send(WaitingRoomEvents.StartGame, roomId);
    }

    leaveRoom(roomId: string): void {
        this.send(WaitingRoomEvents.LeaveRoom, roomId);
    }

}