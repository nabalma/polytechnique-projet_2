import { CharacterCreationService } from '@app/services/character-creation/character-creation.service';
import { WaitingRoomService } from '@app/services/waiting-room/waiting-room.service';
import { AvatarActionPayload } from '@common/interfaces/character-creation/character-creation-interface';
import {
    AddVirtualPlayerPayload,
    CreateRoomPayload,
    JoinRoomPayload,
    KickPlayerPayload,
    RemoveVirtualPlayerPayload,
} from '@common/interfaces/waiting-room/waiting-room-interface';

import { CharacterCreationEvents } from '@common/socket_event/character/character-creation.gateway.events';
import { WaitingRoomEvents } from '@common/socket_event/waiting-room/waiting-room.gateway.events';
import { Injectable, Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import { GameGateway } from '@app/gateways/game/game.gateway';
import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { JoinRoomStatus } from '@common/enum/waiting-room/waiting-room.enum';
import { Namespaces } from '@common/routes/namespaces';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: Namespaces.Match,
})

@Injectable()
export class WaitingRoomGateway implements OnGatewayDisconnect {
    @WebSocketServer() private server: Server;
    private readonly logger = new Logger(WaitingRoomGateway.name);

    constructor(
        private readonly waitingRoomService: WaitingRoomService,
        private readonly characterCreationService: CharacterCreationService,
        private readonly broadcastService: BroadcastService,
        private readonly gameGateway: GameGateway,
    ) {}


    @SubscribeMessage(WaitingRoomEvents.CreateRoom)
    async onCreateRoom(@ConnectedSocket() socket: Socket, @MessageBody() payload: CreateRoomPayload): Promise<void> {
        const { roomId } = await this.waitingRoomService.createRoom(socket.id, payload.player, payload.gameId);
        socket.join(roomId);
        socket.emit(WaitingRoomEvents.RoomCreated, { roomId, playerId: socket.id });
        this.broadcastRoomUpdated(roomId);
        this.broadcastAvailableRoomsUpdate();
    }

    @SubscribeMessage(WaitingRoomEvents.JoinRoom)
    onJoinRoom(socket: Socket, payload: JoinRoomPayload): void {
        const result = this.waitingRoomService.joinRoom(socket.id, payload.player, payload.roomId);
        if (result === JoinRoomStatus.IsLocked || result === JoinRoomStatus.Full || result === JoinRoomStatus.NotFound) {
            socket.emit(WaitingRoomEvents.RoomLocked);
            this.logger.log(`Impossible de rejoindre la room : ${result}`);
            return;
        }

        socket.join(payload.roomId);
        socket.emit(WaitingRoomEvents.JoinRoom, { playerId: socket.id });
        this.broadcastRoomUpdated(payload.roomId);
        this.broadcastAvailableRoomsUpdate();
        this.logger.log(`Joueur ${socket.id} a rejoint la room ${payload.roomId}`);
    }

    @SubscribeMessage(WaitingRoomEvents.LeaveRoom)
    onLeaveRoom(socket: Socket, roomId: string): void {
        const { wasOrganizer, room } = this.waitingRoomService.leaveRoom(socket.id, roomId);
        socket.leave(roomId);

        if (wasOrganizer) {
            this.server.to(roomId).emit(WaitingRoomEvents.OrganizerLeft, { message: "L'organisateur a quitté la salle" });
        } else if (room) {
            this.broadcastRoomUpdated(roomId);
        }

        this.broadcastAvailableRoomsUpdate();
    }

    @SubscribeMessage(WaitingRoomEvents.KickPlayer)
    onKickPlayer(socket: Socket, payload: KickPlayerPayload): void {
        const { socketId, room } = this.waitingRoomService.kickPlayer(payload.roomId, payload.targetPlayerId);

        if (socketId) {
            this.server.to(socketId).emit(WaitingRoomEvents.YouWereKicked, { message: 'Vous avez été expulsé de la salle' });
            this.server.in(socketId).socketsLeave(payload.roomId);
        }

        if (room) {
            this.broadcastRoomUpdated(payload.roomId);
            this.broadcastAvailableRoomsUpdate();
        }
    }

    @SubscribeMessage(WaitingRoomEvents.StartGame)
    onStartGame(socket: Socket, roomId: string): void {
        this.broadcastService.setServer(this.server);
        this.waitingRoomService.startGame(roomId, socket.id);
        this.broadcastAvailableRoomsUpdate();
    }

    @SubscribeMessage(WaitingRoomEvents.GetAvailableRooms)
    onGetAvailableRooms(@ConnectedSocket() socket: Socket): void {
        const rooms = this.waitingRoomService.getAvailableRooms();
        socket.emit(WaitingRoomEvents.AvailableRooms, { rooms });
    }

    @SubscribeMessage(CharacterCreationEvents.JoinCreationRoom)
    onJoinCreationRoom(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string): void {
        socket.join(`creation:${roomId}`);
        const creationAvatars = this.characterCreationService.joinRoom(socket.id, roomId);
        const roomPlayerAvatars = (this.waitingRoomService.getRoomById(roomId)?.players ?? [])
            .map((player) => player.avatar as string)
            .filter(Boolean);
        const takenAvatars = [...new Set([...creationAvatars, ...roomPlayerAvatars])];
        socket.emit(CharacterCreationEvents.CreationRoomState, { takenAvatars });
    }

    @SubscribeMessage(CharacterCreationEvents.LeaveCreationRoom)
    onLeaveCreationRoom(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string): void {
        const releasedAvatar = this.characterCreationService.leaveRoom(socket.id, roomId);
        socket.leave(`creation:${roomId}`);
        if (releasedAvatar) {
            socket.to(`creation:${roomId}`).emit(CharacterCreationEvents.AvatarReleased, { avatarSrc: releasedAvatar });
        }
    }

    @SubscribeMessage(CharacterCreationEvents.AvatarTaken)
    onAvatarTaken(@ConnectedSocket() socket: Socket, @MessageBody() payload: AvatarActionPayload): void {
        this.characterCreationService.takeAvatar(socket.id, payload.roomId, payload.avatarSrc);
        socket.to(`creation:${payload.roomId}`).emit(CharacterCreationEvents.AvatarTaken, { avatarSrc: payload.avatarSrc });
    }

    @SubscribeMessage(CharacterCreationEvents.AvatarReleased)
    onAvatarReleased(@ConnectedSocket() socket: Socket, @MessageBody() payload: AvatarActionPayload): void {
        this.characterCreationService.releaseAvatar(socket.id, payload.roomId, payload.avatarSrc);
        socket.to(`creation:${payload.roomId}`).emit(CharacterCreationEvents.AvatarReleased, { avatarSrc: payload.avatarSrc });
    }

    handleDisconnect(socket: Socket): void {
        const creationInfo = this.characterCreationService.handleDisconnect(socket.id);
        if (creationInfo) {
            this.server
                .to(`creation:${creationInfo.roomId}`)
                .emit(CharacterCreationEvents.AvatarReleased, { avatarSrc: creationInfo.avatarSrc });
        }

        const room = this.waitingRoomService.getRoomForSocket(socket.id);
        if (!room) return;

        const { wasOrganizer, room: updatedRoom } = this.waitingRoomService.leaveRoom(socket.id, room.roomId);

        if (wasOrganizer) {
            this.server.to(room.roomId).emit(WaitingRoomEvents.OrganizerLeft, { message: 'L\'organisateur a quitté la salle' });
        } else if (updatedRoom) {
            this.broadcastRoomUpdated(room.roomId);
        }

        this.broadcastAvailableRoomsUpdate();
    }

    private broadcastRoomUpdated(roomId: string): void {
        const payload = this.waitingRoomService.getRoomUpdatedPayload(roomId);
        if (!payload) return;
        this.server.to(roomId).emit(WaitingRoomEvents.RoomUpdated, payload);
    }

    private broadcastAvailableRoomsUpdate(): void {
        const rooms = this.waitingRoomService.getAvailableRooms();
        this.server.emit(WaitingRoomEvents.RoomsUpdated, { rooms });
        this.gameGateway.broadcastRoomsUpdated(rooms);
    }


    @SubscribeMessage(WaitingRoomEvents.AddVirtualPlayer)
    onAddVirtualPlayer(@ConnectedSocket() socket: Socket, @MessageBody() payload: AddVirtualPlayerPayload): void {
        const result = this.waitingRoomService.addVirtualPlayer(payload.roomId, socket.id, payload.profile);
        if (!result) return;

        this.server.to(`creation:${payload.roomId}`).emit(CharacterCreationEvents.AvatarTaken, { avatarSrc: result.player.avatar });
        this.broadcastRoomUpdated(payload.roomId);
        this.broadcastAvailableRoomsUpdate();
    }

    @SubscribeMessage(WaitingRoomEvents.RemoveVirtualPlayer)
    onRemoveVirtualPlayer(@ConnectedSocket() socket: Socket, @MessageBody() payload: RemoveVirtualPlayerPayload): void {
        const vpAvatar = this.waitingRoomService.getRoomById(payload.roomId)
            ?.players.find((p) => p.id === payload.targetPlayerId)?.avatar as string | undefined;
        const room = this.waitingRoomService.removeVirtualPlayer(payload.roomId, socket.id, payload.targetPlayerId);
        if (!room) return;

        if (vpAvatar) {
            this.server.to(`creation:${payload.roomId}`).emit(CharacterCreationEvents.AvatarReleased, { avatarSrc: vpAvatar });
        }
        this.broadcastRoomUpdated(payload.roomId);
        this.broadcastAvailableRoomsUpdate();
    }
}
