import { Injectable } from '@angular/core';
import { NameSpaces } from 'src/environments/environment';
import { SocketCoreService } from '@app/services/socket/socket-core.service';
import { SocketManager } from '@app/services/socket/socket-manager/socket-manager';

@Injectable({ providedIn: 'root' })

export class ChatSocketService extends SocketCoreService {
    constructor(manager: SocketManager) {
        super(manager, NameSpaces.ChatNamespace);
    }
}