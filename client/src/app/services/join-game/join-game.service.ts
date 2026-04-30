import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameSocketService } from '@app/services/socket/game/game-socket.service';
import { AvailableRoomInfo } from '@common/interfaces/waiting-room/waiting-room-interface';
import { JoinRoomEvents } from '@common/socket_event/join/join-room.gateway.events';
import { Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class JoinGameService {

    rooms = signal<AvailableRoomInfo[]>([]);
    selectedRoom: AvailableRoomInfo | null = null;
    private subscriptions: Subscription[] = [];

    constructor(private socketService: GameSocketService, private router: Router) {}

    async connect() {
        await this.socketService.connect();
        this.listenToSocketEvents();
    }

    disconnect() {
        this.subscriptions.forEach((s) => s.unsubscribe());
        this.subscriptions = [];
        this.socketService.disconnect();
    }

    listenToSocketEvents(): void {
        this.subscriptions.push(
            this.socketService.onRoomsAvailable()?.subscribe((payload: unknown) =>
                this.rooms.set((payload as { rooms: AvailableRoomInfo[] }).rooms),
            ) ?? Subscription.EMPTY,

            this.socketService.onNewRoomsInformation()?.subscribe((newRooms) =>
                this.rooms.set(newRooms),
            ) ?? Subscription.EMPTY,
        );
    }

    getAllAvailableRooms(): void {
        this.socketService.send(JoinRoomEvents.GetAvailableRooms);
    }

    navigateToRoom(): void {
        this.router.navigate(['/creation']);
    }

    navigateToHome(): void {
        this.router.navigate(['/home']);
    }

}