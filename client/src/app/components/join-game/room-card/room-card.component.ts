import { Component, input, output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AvailableRoomInfo } from '@common/interfaces/waiting-room/waiting-room-interface';

@Component({
    selector: 'app-room-card',
    standalone: true,
    imports: [MatTooltipModule],
    templateUrl: './room-card.component.html',
    styleUrl: './room-card.component.scss',
})
export class RoomCardComponent {
    room = input.required<AvailableRoomInfo>();
    isActive = input<boolean>(false);
    selected = output<void>();
    joined = output<void>();
    component: AvailableRoomInfo;
}
