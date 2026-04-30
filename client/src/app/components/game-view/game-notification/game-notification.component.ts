import { Component, inject } from '@angular/core';
import { GameNotificationService } from '@app/services/match/notification/match-notification.service';

@Component({
    selector: 'app-game-notification',
    standalone: true,
    imports: [],
    templateUrl: './game-notification.component.html',
    styleUrl: './game-notification.component.scss',
    providers: [],
})
export class GameNotificationComponent {
    readonly notificationService = inject(GameNotificationService);
}
