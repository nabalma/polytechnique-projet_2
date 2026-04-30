import { PlayerService } from '@app/services/match/player/player.service';
import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'match',
})
@Injectable()
export class PlayerGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  private server: Server;
  private readonly logger = new Logger('PlayerGateway');

  constructor(
    private playerService: PlayerService) {}

  handleConnection(socket: Socket) {
    this.logger.log('Connected player : ', socket.id);
  }

  handleDisconnect(socket: Socket) {
    this.logger.log('Disconnected player: ', socket.id);
    this.playerService.remove(socket.id);
  }

}
