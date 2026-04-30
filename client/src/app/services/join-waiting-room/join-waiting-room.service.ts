import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })

export class JoinWaitingRoomState {

    private roomId: string = '';
    private takenAvaters = signal<string[]>([]);
    private gameId: string = '';

    setWaitingRoom(roomId: string, takenAvatars: string[], gameId: string) {
        this.roomId = roomId;
        this.takenAvaters.set(takenAvatars);
        this.gameId = gameId;
    }

    get roomIdGame(): string {
        return this.roomId;
    }

    get takenAvatersGame(): string[] {
        return this.takenAvaters();
    }
    get gameIdRoom(): string {
        return this.gameId;
    }

    updateTakenAvater(avaterId: string): void {
        this.takenAvaters.update((takenAvater) => [...takenAvater, avaterId]);
    }
}