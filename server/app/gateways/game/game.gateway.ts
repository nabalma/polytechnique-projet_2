import { Game } from '@app/model/schema/game/game';
import { JoinRoomService } from '@app/services/join-waiting-room/join-game.service';
import { AvailableRoomInfo } from '@common/interfaces/waiting-room/waiting-room-interface';
import { GameEvents } from '@common/socket_event/game/game.socket.events';
import { JoinRoomEvents } from '@common/socket_event/join/join-room.gateway.events';
import { Injectable, Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'game',
})
@Injectable()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {

    @WebSocketServer()
    private server: Server;

    private logger = new Logger('GameGateway');


    constructor(private joinRoomService: JoinRoomService) {}


    serverEmitGameCreated(newGame: Game): void {
        this.server.emit(GameEvents.GameCreated, newGame);
        this.logger.log(`Le jeu ${newGame.name} a été créé`);
    }


    serverEmitGameUpdated(updatedGame: Game): void {
        this.server.emit(GameEvents.GameUpdated, updatedGame);
        this.logger.log(`Le jeu ${updatedGame.name} a été mis à jour`);
    }

    @SubscribeMessage(GameEvents.GameVisibilityToggled)
    handleGameVisibility(@ConnectedSocket() socket: Socket, @MessageBody() gameId: string) {
        socket.broadcast.emit(GameEvents.GameVisibilityToggled, gameId);
        this.logger.log(`Le jeu ${gameId} a changé de statut`);

    }


    @SubscribeMessage(GameEvents.GameDeleted)
    handleGameDeleted(@MessageBody() gameId: string) {
        this.serverEmitGameDeleted(gameId);
        this.logger.log(`Le jeu ${gameId} a été effacé`);
    }


    serverEmitGameDeleted(gameId: string): void {
        this.server.emit(GameEvents.GameDeleted, gameId);
    }

    handleConnection(socket: Socket) {
        this.logger.log(`Socket id client connecte : ${socket.id}`);
    }

    handleDisconnect(socket: Socket) {
        this.logger.log(`Socket id client deconnecte : ${socket.id}`);

    }

    broadcastRoomsUpdated(rooms: AvailableRoomInfo[]): void {
        this.server.emit(JoinRoomEvents.RoomsUpdated, rooms);
    }

    @SubscribeMessage(JoinRoomEvents.GetAvailableRooms)
    handleGetAvailableRooms(@ConnectedSocket() socket: Socket) {
        this.joinRoomService.sendAvailableRooms(socket);
    }
}