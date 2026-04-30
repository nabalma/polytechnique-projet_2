import { Injectable, signal } from '@angular/core';
import { LogSocketService } from '@app/services/socket/logs/logs-socket.service';
import { WaitingRoomStateService } from '@app/services/waiting-room/room-state/waiting-room-state.service';
import { DATE_FORMAT_STRING } from '@common/constants/logs/logs.const';
import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { EndPartyLogPayload, GameLogEntry, GameLogPayload } from '@common/interfaces/game-log/game-log-entry.interface';
import { LogCombat } from '@common/interfaces/game-play/combat/combat.interface';
@Injectable({ providedIn: 'root' })
export class LogService {

    logs = signal<GameLogEntry[]>([]);
    private currentCombatRound = 0;

    constructor(private logSocketService: LogSocketService, private joinRoomState: WaitingRoomStateService) {}

    async connect() {
        await this.logSocketService.connect();
        this.logSocketService.createRoom(this.joinRoomState.roomId());
        this.listenToLogSocketEvents();
    }


    disconnect() {
        this.logSocketService.disconnect();
    }

    clearLogs() {
        this.logs.set([]);
    }

    createDateTimestamp(): string {

        const actualTime = new Date();

        const formatDate = new Intl.DateTimeFormat('fr-Fr', {
            hour: DATE_FORMAT_STRING,
            minute: DATE_FORMAT_STRING,
            second: DATE_FORMAT_STRING,
        }).format(actualTime);

        return formatDate;

    }

    private createGameLogPayload(opponentPlayerName?: string, typeOfSanctuary?: ObjectType): GameLogPayload | undefined {
        const currentPlayer = this.joinRoomState.currentPlayer();
        if (!currentPlayer?.name) return;
        const gameLog: GameLogPayload = {
            playerNameActive: currentPlayer?.name,
            roomId: this.joinRoomState.roomId(),
            date: this.createDateTimestamp(),
            defeatPlayerName: opponentPlayerName ?? undefined,
            sanctuaryType: typeOfSanctuary ?? undefined,
        };

        return gameLog;
    }

    addVirtualLog(virtualMessage: string) {
        const virtualLog: GameLogEntry = {
            timestamp: this.createDateTimestamp(),
            message: virtualMessage,
        };
        this.addNewLogs(virtualLog);
    }

    addCombatLog(logCombat: LogCombat, attackerName: string, defenderName: string) {
        this.currentCombatRound++;
        const createdCombatLog: GameLogEntry = {
            timestamp: this.createDateTimestamp(),
            message: '',
            combatData: logCombat,
            attackerName,
            defenderName,
            roundNumber: this.currentCombatRound,
        };
        this.addNewLogs(createdCombatLog);
    }

    private createEndPartyLogPayload(activePlayerNames: string[]): EndPartyLogPayload {
        return {
            date: this.createDateTimestamp(),
            roomId: this.joinRoomState.roomId(),
            playersName: activePlayerNames,
        };
    }
    sendStartTurn(): void {

        const startLog = this.createGameLogPayload();
        if (!startLog) return;
        this.logSocketService.sendStartTurnInformation(startLog);

    }


    sendTransferFlag(answerFlag: boolean): void {
        const flagLog = this.createGameLogPayload();
        if (!flagLog) return;
        if (answerFlag) {
            this.logSocketService.sendSuccessTransferFlag(flagLog);
        } else {
            this.logSocketService.sendFailedTransferFlag(flagLog);
        }


    }

    sendAbandon() {
        this.logs.set([]);
        const abandonLog = this.createGameLogPayload();
        if (!abandonLog) return;
        this.logSocketService.sendAbandonParty(abandonLog);
    }

    sendDoorToggle(isOpen: boolean) {
        const doorLog = this.createGameLogPayload();
        if (!doorLog) return;
        if (isOpen) {
            this.logSocketService.sendOpenDoor(doorLog);
        } else {
            this.logSocketService.sendCloseDoor(doorLog);
        }
    }

    sendDebugToggle(isDebugMode: boolean) {
        const debugLog = this.createGameLogPayload();
        if (!debugLog) return;
        if (isDebugMode) {
            this.logSocketService.sendActivationDebug(debugLog);
        } else {
            this.logSocketService.sendDeactivationDebug(debugLog);
        }
    }

    sendSanctuaryAction(sanctuaryType: ObjectType) {
        const sanctuaryLog = this.createGameLogPayload(undefined, sanctuaryType);
        if (!sanctuaryLog) return;
        this.logSocketService.sendSanctuary(sanctuaryLog);
    }

    sendEndParty(activePlayerNames: string[]) {
        const endGameLog = this.createEndPartyLogPayload(activePlayerNames);
        this.logSocketService.sendEndParty(endGameLog);
    }

    sendFlagPicked() {
        const flagLog = this.createGameLogPayload();
        if (!flagLog) return;
        this.logSocketService.sendFlagPicked(flagLog);
    }

    sendStartFight(opponentName: string, attackerId: string, defenderId: string) {
        this.currentCombatRound = 0;
        const fightLog = this.createGameLogPayload(opponentName);
        if (!fightLog) return;
        fightLog.combatPlayerIds = [attackerId, defenderId];
        this.logSocketService.sendStartFight(fightLog);
    }

    sendEndFight(winnerName: string, loserName: string, winnerId: string, loserId: string) {
        const fightLog = this.createGameLogPayload(loserName);
        if (!fightLog) return;
        fightLog.playerNameActive = winnerName;
        fightLog.combatPlayerIds = [winnerId, loserId];
        this.logSocketService.sendEndFight(fightLog);
    }

    private listenToLogSocketEvents() {
        this.listenToTurnAndDebugEvents();
        this.listenToCombatEvents();
        this.listenToFlagAndDoorEvents();
    }

    private listenToTurnAndDebugEvents() {
        this.logSocketService.onStartTurn()?.subscribe((startTurnLog) => {
            this.addNewLogs(startTurnLog);
        });
        this.logSocketService.onActivationDebug()?.subscribe((debugLog) =>
            this.addNewLogs(debugLog),
        );
        this.logSocketService.onDesactivationDebug()?.subscribe((debugLog) =>
            this.addNewLogs(debugLog),
        );
        this.logSocketService.onAbandonParty()?.subscribe((abandonLog) =>
            this.addNewLogs(abandonLog),
        );
        this.logSocketService.onEndParty()?.subscribe((endPartyLog) =>
            this.addNewLogs(endPartyLog),
        );
        this.logSocketService.onSanctuaryAction()?.subscribe((sanctuaryLog) =>
            this.addNewLogs(sanctuaryLog),
        );
    }

    private listenToCombatEvents() {
        this.logSocketService.onStartFight()?.subscribe((startFightLog) =>
            this.addNewLogs(startFightLog),
        );
        this.logSocketService.onEndFight()?.subscribe((endFightLog) =>
            this.addNewLogs(endFightLog),
        );
    }

    private listenToFlagAndDoorEvents() {
        this.logSocketService.onSuccessFlagTransfer()?.subscribe((successLog) =>
            this.addNewLogs(successLog),
        );
        this.logSocketService.onFailedFlagTransfer()?.subscribe((failedLog) =>
            this.addNewLogs(failedLog),
        );
        this.logSocketService.onFlagPicked()?.subscribe((flagLog) =>
            this.addNewLogs(flagLog),
        );
        this.logSocketService.onDoorOpen()?.subscribe((openDoorLog) =>
            this.addNewLogs(openDoorLog),
        );
        this.logSocketService.onCloseDoor()?.subscribe((openCloseLog) =>
            this.addNewLogs(openCloseLog),
        );
    }

    private addNewLogs(newLog: GameLogEntry) {
        if (newLog.combatPlayerIds) {
            const currentId = this.joinRoomState.currentPlayerId();
            if (!newLog.combatPlayerIds.includes(currentId)) return;
        }
        if (!this.verifyIfLogsExist(newLog)) this.logs.update((logsInformation) => [...logsInformation, newLog]);
    }


    private verifyIfLogsExist(newLog: GameLogEntry): boolean {
        return this.logs().some(log => JSON.stringify(log) === JSON.stringify(newLog));
    }


}