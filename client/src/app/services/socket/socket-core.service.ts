import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io-client';
import { NameSpaces } from 'src/environments/environment';
import { SocketManager } from './socket-manager/socket-manager';

@Injectable({ providedIn: 'root' })

export class SocketCoreService implements OnDestroy {

    protected socket!: Socket;

    constructor(
        private socketManager: SocketManager,
        private namespace: NameSpaces,
    ) {}

    async connect() {
        if (this.socket?.connected) this.disconnect();
        this.socket = await this.socketManager.connect(this.namespace);
    }

    on<T>(event: string): Observable<T> | null {
        if (!this.socket) return null;
        return new Observable<T>((observer) => {
            const handler = (data: T) => observer.next(data);
            this.socket.on(event, handler);
            return () => {
                this.socket.off(event, handler);
            };
        });
    }

    send(event: string, data?: unknown) {
        if (!this.socket) return;
        this.socket.emit(event, data);
    }

    ngOnDestroy(): void {
        this.socket?.disconnect();
    }

    disconnect() {
        this.socket?.disconnect();
    }

    get id() {
        if (this.socket)
            return this.socket.id;
        return null;
    }
}
