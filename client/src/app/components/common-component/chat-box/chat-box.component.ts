import { AfterViewChecked, Component, ElementRef, ViewChild, effect, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatStateService } from '@app/services/chat/chat-state.service';
import { ChatSocketService } from '@app/services/socket/chat/chat-socket.service';
import { MAX_MESSAGE_LENGTH } from '@common/constants/chat/chat.constants';
import { TIMER_DISPLAY_PAD_LENGTH } from '@common/constants/game-view/game-view.constants';
import { ChatMessage } from '@common/interfaces/chat/chat-message-interface';
import { ChatEvents } from '@common/socket_event/chat/chat.gateway.events';

@Component({
    selector: 'app-chat-box',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './chat-box.component.html',
    styleUrl: './chat-box.component.scss',
})
export class ChatBoxComponent implements AfterViewChecked {
    readonly gameId = input<string>('');
    readonly playerName = input<string>('');
    readonly isAbandoned = input<boolean>(false);
    readonly title = input<string>('Zone de clavardage');

    @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLElement>;

    messageInput: string = '';
    readonly maxLength = MAX_MESSAGE_LENGTH;

    private shouldScrollToBottom = true;
    private lastMessageCount = 0;

    constructor(
        private readonly socketService: ChatSocketService,
        private readonly chatState: ChatStateService,

    ) {
        effect(() => {
            const id = this.gameId();
            if (id) void this.chatState.joinRoom(id);
        });
    }

    get messages(): ChatMessage[] {
        return this.chatState.messages;
    }

    ngAfterViewChecked(): void {
        if (this.messages.length !== this.lastMessageCount) {
            this.lastMessageCount = this.messages.length;
            this.shouldScrollToBottom = true;
        }
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    createTimestamp(): string {
        const now = new Date();
        const pad = (value: number) => value.toString().padStart(TIMER_DISPLAY_PAD_LENGTH, '0');
        const timestamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        return timestamp;

    }

    sendMessage(): void {
        const content = this.messageInput.trim();
        const actualTime = this.createTimestamp();
        if (!content || content.length > this.maxLength || this.isAbandoned()) return;

        this.socketService.send(ChatEvents.SendMessage, {
            author: this.playerName(),
            content,
            timestamp: actualTime,
            gameId: this.gameId(),
        });
        this.messageInput = '';
    }

    private scrollToBottom(): void {
        const container = this.messagesContainer?.nativeElement;
        if (container) container.scrollTop = container.scrollHeight;
    }
    onInputFocus() {
        this.chatState.isOnFocus = true;
    }
    onLostFocus() {
        this.chatState.isOnFocus = false;
    }
}
