import { Component, output } from '@angular/core';
import { PlayerCardComponent } from '@app/components/waiting-room/player-card/player-card.component';
import { WaitingRoomStateService } from '@app/services/waiting-room/room-state/waiting-room-state.service';

@Component({
    selector: 'app-waiting-player-list',
    standalone: true,
    imports: [PlayerCardComponent],
    templateUrl: './player-list.component.html',
    styleUrl: './player-list.component.scss',
})
export class WaitingPlayerListComponent {
    readonly kickPlayer = output<string>();

    constructor(public waitingRoom: WaitingRoomStateService) {}

    get currentPlayerId() {
        return this.waitingRoom.currentPlayerId;
    }

    get players() {
        return this.waitingRoom.players();
    }

    get organizerId() {
        return this.waitingRoom.organizerId;
    }
}
