import { Injectable } from '@angular/core';
import { SocketCoreService } from '@app/services/socket/socket-core.service';
import { SocketManager } from '@app/services/socket/socket-manager/socket-manager';
import { EndPartyLogPayload, GameLogEntry, GameLogPayload } from '@common/interfaces/game-log/game-log-entry.interface';
import { LogsEvent } from '@common/socket_event/logs/logs.gateway.events';
import { NameSpaces } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })

export class LogSocketService extends SocketCoreService {

    constructor(manager: SocketManager) {
        super(manager, NameSpaces.LogNamespace);
    }


    createRoom(roomId: string) {
        this.send(LogsEvent.CreateRoom, roomId);
    }

    sendStartTurnInformation(startLog: GameLogPayload) {
        this.send(LogsEvent.StartTurn, startLog);
    }

    sendFailedTransferFlag(flagLog: GameLogPayload) {
        this.send(LogsEvent.FailedFlagTransfer, flagLog);
    }

    sendSuccessTransferFlag(flagLog: GameLogPayload) {
        this.send(LogsEvent.SuccessFlagTransfer, flagLog);
    }

    sendAbandonParty(abandonLog: GameLogPayload) {
        this.send(LogsEvent.AbandonParty, abandonLog);
    }

    sendActivationDebug(debugLog: GameLogPayload) {
        this.send(LogsEvent.ActivationModeDebug, debugLog);
    }

    sendDeactivationDebug(debugLog: GameLogPayload) {
        this.send(LogsEvent.DeactivationModeDebug, debugLog);
    }

    sendOpenDoor(doorLog: GameLogPayload) {
        this.send(LogsEvent.OpenDoor, doorLog);
    }

    sendCloseDoor(doorLog: GameLogPayload) {
        this.send(LogsEvent.CloseDoor, doorLog);
    }

    sendSanctuary(sanctuaryLog: GameLogPayload) {
        this.send(LogsEvent.SanctuaryAction, sanctuaryLog);
    }

    sendEndParty(endPartyLog: EndPartyLogPayload) {
        this.send(LogsEvent.EndParty, endPartyLog);
    }

    sendFlagPicked(flagLog: GameLogPayload) {
        this.send(LogsEvent.FlagPicked, flagLog);
    }

    sendStartFight(fightLog: GameLogPayload) {
        this.send(LogsEvent.StartFight, fightLog);
    }

    sendEndFight(fightLog: GameLogPayload) {
        this.send(LogsEvent.EndFight, fightLog);
    }

    onStartTurn() {
        return this.on<GameLogEntry>(LogsEvent.StartTurn);
    }

    onStartFight() {
        return this.on<GameLogEntry>(LogsEvent.StartFight);
    }

    onActivationDebug() {
        return this.on<GameLogEntry>(LogsEvent.ActivationModeDebug);
    }

    onDesactivationDebug() {
        return this.on<GameLogEntry>(LogsEvent.DeactivationModeDebug);
    }

    onAbandonParty() {
        return this.on<GameLogEntry>(LogsEvent.AbandonParty);
    }


    onSuccessFlagTransfer() {
        return this.on<GameLogEntry>(LogsEvent.SuccessFlagTransfer);
    }

    onFailedFlagTransfer() {
        return this.on<GameLogEntry>(LogsEvent.FailedFlagTransfer);
    }

    onDoorOpen() {
        return this.on<GameLogEntry>(LogsEvent.OpenDoor);
    }

    onCloseDoor() {
        return this.on<GameLogEntry>(LogsEvent.CloseDoor);
    }

    onSanctuaryAction() {
        return this.on<GameLogEntry>(LogsEvent.SanctuaryAction);
    }

    onEndParty() {
        return this.on<GameLogEntry>(LogsEvent.EndParty);
    }

    onFlagPicked() {
        return this.on<GameLogEntry>(LogsEvent.FlagPicked);
    }

    onEndFight() {
        return this.on<GameLogEntry>(LogsEvent.EndFight);
    }
}