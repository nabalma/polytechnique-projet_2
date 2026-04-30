import { EndPartyLogPayload, GameLogEntry, GameLogPayload } from '@common/interfaces/game-log/game-log-entry.interface';
import { LogsEvent } from '@common/socket_event/logs/logs.gateway.events';
import { Injectable, Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'log',
})
@Injectable()
export class LogGateWay implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    private logServer: Server;
    private loggerLog = new Logger('LogGateway');

    handleConnection(socket: Socket) {
        this.loggerLog.log(`Le joueur ${socket.id} est connecté`);
    }

    handleDisconnect(socket: Socket) {
        this.loggerLog.log(`Le joueur ${socket.id} s'est deconnecté`);
    }

    @SubscribeMessage(LogsEvent.CreateRoom)
    handleCreateRoom(@ConnectedSocket() socket: Socket, @MessageBody() roomId) {
        socket.join(roomId);
        this.loggerLog.log(`${socket.id} du Joueur a rejoint la room ${roomId}`);
    }

    @SubscribeMessage(LogsEvent.StartTurn)
    handleStartTurn(@MessageBody() logsData: GameLogPayload) {
        const startTurnLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Début du tour du joueur ${logsData.playerNameActive}`,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.StartTurn, startTurnLog);
        this.loggerLog.log(`Début du tour : ${logsData.playerNameActive}`);
    }

    @SubscribeMessage(LogsEvent.ActivationModeDebug)
    handleActivationModeDebug(@MessageBody() logsData: GameLogPayload) {
        const debugLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Le mode débogage a été activé`,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.ActivationModeDebug, debugLog);
    }

    @SubscribeMessage(LogsEvent.DeactivationModeDebug)
    handleDesactivationDebug(@MessageBody() logsData: GameLogPayload) {
        const debugLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Le mode débogage a été désactivé`,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.DeactivationModeDebug, debugLog);
    }

    @SubscribeMessage(LogsEvent.AbandonParty)
    handleGiveUp(@MessageBody() logsData: GameLogPayload) {
        const giveUpLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Le joueur ${logsData.playerNameActive} a abandonné la partie`,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.AbandonParty, giveUpLog);
    }

    @SubscribeMessage(LogsEvent.SuccessFlagTransfer)
    handleSuccessFlagTransfer(@MessageBody() logsData: GameLogPayload) {
        const flagSuccessLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Le joueur ${logsData.playerNameActive} a transféré le drapeau`,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.SuccessFlagTransfer, flagSuccessLog);
    }

    @SubscribeMessage(LogsEvent.FailedFlagTransfer)
    handleFailedFlagTransfer(@MessageBody() logsData: GameLogPayload) {
        const failedLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Le joueur ${logsData.playerNameActive} n'a pas pu transférer le drapeau`,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.FailedFlagTransfer, failedLog);
    }

    @SubscribeMessage(LogsEvent.OpenDoor)
    handleDoorOpen(@MessageBody() logsData: GameLogPayload) {
        const openDoorLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Le joueur ${logsData.playerNameActive} a ouvert une porte`,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.OpenDoor, openDoorLog);
    }

    @SubscribeMessage(LogsEvent.CloseDoor)
    handleDoorClose(@MessageBody() logsData: GameLogPayload) {
        const closeDoorLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Le joueur ${logsData.playerNameActive} a fermé une porte`,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.CloseDoor, closeDoorLog);
    }

    @SubscribeMessage(LogsEvent.SanctuaryAction)
    handleSanctuaryAction(@MessageBody() logsData: GameLogPayload) {
        const sanctuaryLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Le joueur ${logsData.playerNameActive} a utilisé le sanctuaire ${logsData.sanctuaryType}`,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.SanctuaryAction, sanctuaryLog);
    }

    @SubscribeMessage(LogsEvent.StartFight)
    handleStartingFight(@MessageBody() logsData: GameLogPayload) {
        const startFightLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Début du combat entre ${logsData.playerNameActive} et ${logsData.defeatPlayerName}`,
            combatPlayerIds: logsData.combatPlayerIds,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.StartFight, startFightLog);
    }

    @SubscribeMessage(LogsEvent.EndFight)
    handleEndFight(@MessageBody() logsData: GameLogPayload) {
        const endFightLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Fin du combat. Vainqueur : ${logsData.playerNameActive}. Défaite de : ${logsData.defeatPlayerName}`,
            combatPlayerIds: logsData.combatPlayerIds,
        };
        this.logServer.to(logsData.roomId).emit(LogsEvent.EndFight, endFightLog);
    }

    @SubscribeMessage(LogsEvent.EndParty)
    handleEndParty(@MessageBody() logData: EndPartyLogPayload) {
        const endPartyLog: GameLogEntry = {
            timestamp: logData.date,
            message: `Fin de la partie. Joueurs encore actifs : ${logData.playersName.join(', ')}`,
        };
        this.logServer.to(logData.roomId).emit(LogsEvent.EndParty, endPartyLog);
    }

    @SubscribeMessage(LogsEvent.FlagPicked)
    handleFlagPicked(@MessageBody() logsData: GameLogPayload) {
        const flagLog: GameLogEntry = {
            timestamp: logsData.date,
            message: `Le joueur ${logsData.playerNameActive} a ramassé le drapeau`,
        };

        this.logServer.to(logsData.roomId).emit(LogsEvent.FlagPicked, flagLog);
    }
}
