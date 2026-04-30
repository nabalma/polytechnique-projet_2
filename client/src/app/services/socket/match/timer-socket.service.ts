import { Injectable } from '@angular/core';
import { SocketCoreService } from '@app/services/socket/socket-core.service';
import { SocketManager } from '@app/services/socket/socket-manager/socket-manager';
import { NameSpaces } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })

export class TimerSocketService extends SocketCoreService {
    constructor(manager: SocketManager) {
        super(manager, NameSpaces.TimerNamespace);
    }
}