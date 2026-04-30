import { WaitingRoomService } from '@app/services/waiting-room/waiting-room.service';
import { JoinRoomEvents } from '@common/socket_event/join/join-room.gateway.events';
import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';


@Injectable()
export class JoinRoomService {

    constructor(private readonly waitingRoomService: WaitingRoomService) {}

    sendAvailableRooms(socket: Socket): void {
        const rooms = this.waitingRoomService.getAvailableRooms();
        socket.emit(JoinRoomEvents.AvailableRooms, { rooms });
    }
}