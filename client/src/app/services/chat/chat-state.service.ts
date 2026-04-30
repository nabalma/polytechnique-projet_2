import { Injectable, OnDestroy } from '@angular/core';
import { ChatSocketService } from '@app/services/socket/chat/chat-socket.service';
import { ChatMessage } from '@common/interfaces/chat/chat-message-interface';
import { ChatEvents } from '@common/socket_event/chat/chat.gateway.events';
import { Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatStateService implements OnDestroy {
    messages: ChatMessage[] = [];
    private subscription: Subscription | null = null;
    private currentRoomId: string = '';
    private _isOnFocus: boolean = false;

    constructor(private readonly socketService: ChatSocketService) {}

    get isOnFocus() {
        return this._isOnFocus;
    }

    set isOnFocus(focus: boolean) {
        if (focus === this._isOnFocus) return;
        this._isOnFocus = focus;
    }

    async joinRoom(roomId: string): Promise<void> {
        if (!roomId) return;

        if (roomId !== this.currentRoomId) {
            this.messages = [];
            this.currentRoomId = roomId;
            await this.socketService.connect();
            this.subscription?.unsubscribe();
            this.subscription = null;
        }

        if (!this.subscription) {
            const observable = this.socketService.on<ChatMessage>(ChatEvents.NewMessage);
            if (observable) {
                this.subscription = observable.subscribe((message) => {
                    this.messages.push(message);
                });
            }
        }

        this.socketService.send(ChatEvents.JoinRoom, roomId);
    }

    reset(): void {
        this.messages = [];
        this.currentRoomId = '';
        this.subscription?.unsubscribe();
        this.subscription = null;
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }
}
