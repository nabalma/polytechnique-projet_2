import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { ChatBoxComponent } from '@app/components/common-component/chat-box/chat-box.component';
import { StatusMessageZone } from '@common/enum/chat/message-zone.enum';
import { GameLogEntry } from '@common/interfaces/game-log/game-log-entry.interface';
@Component({
    selector: 'app-message-zone',
    standalone: true,
    imports: [CommonModule, ChatBoxComponent],
    templateUrl: './message-zone.component.html',
    styleUrl: './message-zone.component.scss',
})
export class MessageZoneComponent {
    readonly statusMessageZone = StatusMessageZone;
    readonly gameId = input<string>('');
    readonly playerName = input<string>('');
    readonly isAbandoned = input<boolean>(false);
    readonly logEntries = input<GameLogEntry[]>([]);


    activeTab: StatusMessageZone = StatusMessageZone.Chat;
}
