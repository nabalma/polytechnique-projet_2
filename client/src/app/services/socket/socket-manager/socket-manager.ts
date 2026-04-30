import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment, NameSpaces } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketManager {
    private sockets: Map<string, Socket> = new Map();

    connect(namespace: NameSpaces): Promise<Socket> {
        if (this.sockets.has(namespace)) {
            return Promise.resolve(this.sockets.get(namespace) as Socket);
        }
        return new Promise((resolve, reject) => {
            const socket: Socket = io(`${environment.baseUrl}${namespace}`, {
                transports: ['websocket'],
                autoConnect: true,
            });

            socket.on('connect', () => {
                this.sockets.set(namespace, socket);
                resolve(socket);
            });
            socket.on('disconnect', () => {
                this.sockets.delete(namespace);
            });

            socket.on('connect_error', err => reject(err));
        });
    }
}