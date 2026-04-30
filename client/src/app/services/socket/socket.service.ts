import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
    private socket: Socket;

    constructor() {
        this.socket = io(environment.baseUrl, {
            transports: ['websocket'],
        });
    }

    on<T>(event: string): Observable<T> {
        return new Observable<T>((observer) => {
            const handler = (data: T) => observer.next(data);
            this.socket.on(event, handler);

            return () => {
                this.socket.off(event, handler);
            };
        });
    }

    get socketId(): string {
        return this.socket.id ?? '';
    }

    send(event: string, data?: unknown): void {
        this.socket.emit(event, data);
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}
