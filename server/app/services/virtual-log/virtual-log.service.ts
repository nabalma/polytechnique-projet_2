import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { LogsEvent } from '@common/socket_event/logs/logs.gateway.events';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LogVirtualPlayerService {


    constructor(private broadCast: BroadcastService) {}

    sendVirtualStartTurn(roomId: string, playerName: string) {
        const message = `Début du tour du joueur ${playerName}`;
        this.broadCast.emitToRoom(roomId, LogsEvent.VirtualLog, message);
    }

    sendVirtualFlagPicked(roomId: string, playerName: string) {
        const message = `Le joueur ${playerName} a ramassé le drapeau`;
        this.broadCast.emitToRoom(roomId, LogsEvent.VirtualLog, message);
    }

    sendVirtualSanctuaryAction(roomId: string, playerName: string, sanctuaryType: string) {
        const message = `Le joueur ${playerName} a utilisé le sanctuaire ${sanctuaryType}`;
        this.broadCast.emitToRoom(roomId, LogsEvent.VirtualLog, message);
    }

    sendVirtualDoorAction(roomId: string, playerName: string) {
        const message = `Le joueur ${playerName} a utilisé la porte`;
        this.broadCast.emitToRoom(roomId, LogsEvent.VirtualLog, message);
    }

    sendVirtualStartFight(roomId: string, playerName: string, opponentName: string) {
        const message = `Debut de combat entre le joueur ${playerName} et ${opponentName}`;
        this.broadCast.emitToRoom(roomId, LogsEvent.VirtualLog, message);
    }

}