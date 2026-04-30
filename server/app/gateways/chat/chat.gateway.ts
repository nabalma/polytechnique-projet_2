import { DELAY_BEFORE_EMITTING_TIME, WORD_MAX_LENGTH } from '@app/constants/chat.constants';
import { ChatMessage } from '@common/interfaces/chat/chat-message-interface';
import { ChatEvents } from '@common/socket_event/chat/chat.gateway.events';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';


@WebSocketGateway({ cors: { origin: '*' }, namespace: 'chat' })
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleDestroy {
    @WebSocketServer() private server: Server;

    private readonly leftPlayers = new Set<string>();
    private clockInterval: ReturnType<typeof setInterval>;

    constructor(private readonly logger: Logger) {}

    @SubscribeMessage(ChatEvents.JoinRoom)
    joinRoom(socket: Socket, gameId: string) {
        socket.join(gameId);
    }

    @SubscribeMessage(ChatEvents.SendMessage)
    sendMessage(socket: Socket, message: ChatMessage) {
        if (this.leftPlayers.has(socket.id)) return;
        if (!message?.content || message.content.length > WORD_MAX_LENGTH) return;
        this.server.to(message.gameId).emit(ChatEvents.NewMessage, message);
    }

    @SubscribeMessage(ChatEvents.LeaveRoom)
    leaveRoom(socket: Socket) {
        this.leftPlayers.add(socket.id);
    }

    afterInit() {
        this.clockInterval = setInterval(() => {
            this.emitTime();
        }, DELAY_BEFORE_EMITTING_TIME);
    }

    onModuleDestroy() {
        clearInterval(this.clockInterval);
    }

    handleConnection(socket: Socket) {
        this.logger.log(`Connexion par l'utilisateur avec id : ${socket.id}`);
        socket.emit(ChatEvents.Hello, 'Hello World!');
    }

    handleDisconnect(socket: Socket) {
        this.logger.log(`Déconnexion par l'utilisateur avec id : ${socket.id}`);
        this.leftPlayers.delete(socket.id);
    }

    private emitTime() {
        this.server.emit(ChatEvents.Clock, new Date().toLocaleTimeString());
    }
}
