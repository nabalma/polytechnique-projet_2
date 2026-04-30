import { Injectable } from '@angular/core';
import { SocketCoreService } from '@app/services/socket/socket-core.service';
import { SocketManager } from '@app/services/socket/socket-manager/socket-manager';
import { GameInterface } from '@common/interfaces/game-frontend/game-interface';
import { AvailableRoomInfo } from '@common/interfaces/waiting-room/waiting-room-interface';
import { GameEvents } from '@common/socket_event/game/game.socket.events';
import { JoinRoomEvents } from '@common/socket_event/join/join-room.gateway.events';
import { NameSpaces } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class GameSocketService extends SocketCoreService {
    constructor(manager: SocketManager) {
        super(manager, NameSpaces.GameNamespace);
    }


    sendVisibilityToggled(gameId: string) {
        this.send(GameEvents.GameVisibilityToggled, gameId);
    }

    sendDeletedGame(gameId: string) {
        this.send(GameEvents.GameDeleted, gameId);
    }

    onGameCreated() {
        return this.on<GameInterface>(GameEvents.GameCreated);
    }

    onGameUpdated() {
        return this.on<GameInterface>(GameEvents.GameUpdated);
    }

    onGameDeleted() {
        return this.on<string>(GameEvents.GameDeleted);
    }

    onGameVisibilityToggled() {
        return this.on<string>(GameEvents.GameVisibilityToggled);
    }

    onRoomsAvailable() {
        return this.on<AvailableRoomInfo[]>(JoinRoomEvents.AvailableRooms);
    }

    onNewRoomsInformation() {
        return this.on<AvailableRoomInfo[]>(JoinRoomEvents.RoomsUpdated);
    }
}
