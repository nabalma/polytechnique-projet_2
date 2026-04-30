import { Component, input } from '@angular/core';
import { GameGridComponent } from '@app/components/common-component/game-grid/game-grid.component';
import { AvailableRoomInfo } from '@common/interfaces/waiting-room/waiting-room-interface';

@Component({
    selector: 'app-room-preview',
    standalone: true,
    imports: [GameGridComponent],
    templateUrl: './room-preview.component.html',
    styleUrl: './room-preview.component.scss',
})
export class RoomPreviewComponent {
    room = input.required<AvailableRoomInfo>();
}
