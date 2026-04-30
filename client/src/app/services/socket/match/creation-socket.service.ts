import { Injectable } from '@angular/core';
import { SocketCoreService } from '@app/services/socket/socket-core.service';
import { SocketManager } from '@app/services/socket/socket-manager/socket-manager';
import {
    AvatarActionPayload,
    AvatarBroadcastPayload,
    CreationRoomStatePayload,
} from '@common/interfaces/character-creation/character-creation-interface';
import { MiniPlayerInfo } from '@common/interfaces/player/player-interface';
import { JoinRoomSuccessPayload } from '@common/interfaces/waiting-room/waiting-room-interface';
import { CharacterCreationEvents } from '@common/socket_event/character/character-creation.gateway.events';
import { WaitingRoomEvents } from '@common/socket_event/waiting-room/waiting-room.gateway.events';
import { Observable } from 'rxjs';
import { NameSpaces } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class CreationSocketService extends SocketCoreService {
    constructor(manager: SocketManager) {
        super(manager, NameSpaces.MatchNamespace);
    }

    joinCreationRoom(roomId: string): void {
        this.send(CharacterCreationEvents.JoinCreationRoom, roomId);
    }

    leaveCreationRoom(roomId: string): void {
        this.send(CharacterCreationEvents.LeaveCreationRoom, roomId);
    }

    selectAvatar(roomId: string, avatarSrc: string): void {
        const payload: AvatarActionPayload = { roomId, avatarSrc };
        this.send(CharacterCreationEvents.AvatarTaken, payload);
    }

    releaseAvatar(roomId: string, avatarSrc: string): void {
        const payload: AvatarActionPayload = { roomId, avatarSrc };
        this.send(CharacterCreationEvents.AvatarReleased, payload);
    }

    onAvatarTaken(): Observable<AvatarBroadcastPayload> | null {
        return this.on<AvatarBroadcastPayload>(CharacterCreationEvents.AvatarTaken);
    }

    onAvatarReleased(): Observable<AvatarBroadcastPayload> | null {
        return this.on<AvatarBroadcastPayload>(CharacterCreationEvents.AvatarReleased);
    }

    onCreationRoomState(): Observable<CreationRoomStatePayload> | null {
        return this.on<CreationRoomStatePayload>(CharacterCreationEvents.CreationRoomState);
    }

    sendJoinRoom(player: MiniPlayerInfo, roomId: string): void {
        this.send(WaitingRoomEvents.JoinRoom, { player, roomId });
    }

    onJoinRoomSuccess(): Observable<JoinRoomSuccessPayload> | null {
        return this.on<JoinRoomSuccessPayload>(WaitingRoomEvents.JoinRoom);
    }

    onJoinRejected(): Observable<void> | null {
        return this.on<void>(WaitingRoomEvents.RoomLocked);
    }
}
