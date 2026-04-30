import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BackButtonComponent } from '@app/components/common-component/back-button/back-button.component';
import { BackgroundImageComponent } from '@app/components/common-component/background-image/background-image.component';
import { PanelBackgroundComponent } from '@app/components/common-component/panel-background/panel-background.component';
import { RoomCardComponent } from '@app/components/join-game/room-card/room-card.component';
import { RoomPreviewComponent } from '@app/components/join-game/room-preview/room-preview.component';
import { JoinGameService } from '@app/services/join-game/join-game.service';
import { JoinWaitingRoomState } from '@app/services/join-waiting-room/join-waiting-room.service';
import { AvailableRoomInfo } from '@common/interfaces/waiting-room/waiting-room-interface';


@Component({
    selector: 'app-join-game-page',
    standalone: true,
    imports: [BackButtonComponent, RoomCardComponent, RoomPreviewComponent, BackgroundImageComponent, PanelBackgroundComponent],
    providers: [JoinGameService],
    templateUrl: './join-game-page.component.html',
    styleUrl: './join-game-page.component.scss',
})
export class JoinGamePageComponent implements OnInit, OnDestroy {
    constructor(
        public joinGameService: JoinGameService,
        private router: Router,
        private joinWaitingRoomState: JoinWaitingRoomState,
    ) {}

    ngOnInit(): void {

        this.joinGameService.connect().then(() => {
            this.joinGameService.getAllAvailableRooms();
        });
    }

    ngOnDestroy() {
        this.joinGameService.disconnect();
    }

    selectRoom(room: AvailableRoomInfo): void {
        this.joinGameService.selectedRoom = room;
    }

    join(room:AvailableRoomInfo): void {
        this.joinWaitingRoomState.setWaitingRoom(room.roomId, room.takenAvatars, room.gameId);
        this.router.navigate(['/creation']);
    }

    navigateBack(): void {
        this.joinGameService.navigateToHome();
    }

    navigateToGameSelection(): void {
        this.router.navigate(['/game-selection']);
    }

}


