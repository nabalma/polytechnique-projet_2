import { Injectable, signal } from '@angular/core';
import { LogService } from '@app/services/logs/logs.service';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import { WaitingRoomStateService } from '@app/services/waiting-room/room-state/waiting-room-state.service';
import {
    FLAG_TRANSFER_CANCELLED_REQUESTER_MESSAGE,
    FLAG_TRANSFER_CANCELLED_TARGET_MESSAGE,
    FLAG_TRANSFER_DECLINED_MESSAGE,
    FLAG_TRANSFER_NOT_POSSIBLE_ERROR,
    PLAYER_ABANDONED_FLAG,
} from '@common/constants/game-view/game-view.constants';
import { FlagTransferCancelledPayload } from '@common/interfaces/game-play/flag/flag.interface';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { MatchEvents } from '@common/socket_event/match/match.gateway.events';
import { MatchService } from '@app/services/match/match.service';
import { GameNotificationService } from '@app/services/match/notification/match-notification.service';

@Injectable({ providedIn: 'root' })
export class FlagTransferService {
    readonly showSelector = signal(false);
    waitingForTransferResponse = false;

    constructor(
        private readonly matchService: MatchService,
        private readonly stateService: WaitingRoomStateService,
        private readonly notifications: GameNotificationService,
        private readonly socketService: MatchSocketService,
        private readonly logService: LogService,
    ) {
        this.registerListeners();
    }

    private registerListeners(): void {
        this.socketService.on<FlagTransferCancelledPayload>(MatchEvents.FlagTransferCancelled)?.subscribe(
            (payload: FlagTransferCancelledPayload) => {
                this.handleFlagTransferCancelled(payload);
            },
        );
        this.socketService.on<void>(MatchEvents.FlagTransferred)?.subscribe(() => {
            this.waitingForTransferResponse = false;
        });
        this.socketService.on<void>(MatchEvents.FlagTransferDeclined)?.subscribe(() => {
            this.handleFlagTransferDeclined();
        });
    }

    private handleFlagTransferDeclined(): void {
        this.waitingForTransferResponse = false;
        this.notifications.showMoveError(FLAG_TRANSFER_DECLINED_MESSAGE);
    }

    private get currentPlayer(): Player | null {
        const currentPlayerId = this.stateService.currentPlayerId();
        if (!currentPlayerId) return null;
        return this.matchService.players().get(currentPlayerId) ?? null;
    }

    get adjacentEligibleTargets(): Player[] {
        const currentPlayer = this.currentPlayer;
        if (!currentPlayer?.position) return [];
        return Array.from(this.matchService.players().values()).filter(
            (player) => this.isEligibleTarget(player, currentPlayer),
        );
    }

    handleTeammateAction(): void {
        if (this.adjacentEligibleTargets.length > 0) {
            this.showSelector.set(true);
            return;
        }
        this.notifications.showMoveError(FLAG_TRANSFER_NOT_POSSIBLE_ERROR);
    }

    closeSelector(): void {
        this.showSelector.set(false);
    }

    requestTransfer(targetPlayerId: string): void {
        this.matchService.requestFlagTransfer(targetPlayerId);
        this.waitingForTransferResponse = true;
        this.closeSelector();
    }

    private handleFlagTransferCancelled(payload: FlagTransferCancelledPayload): void {
        this.waitingForTransferResponse = false;
        this.matchService.pendingTransferRequest.set(null);
        this.logService.sendTransferFlag(false);
        const message = payload.isRequester
            ? FLAG_TRANSFER_CANCELLED_REQUESTER_MESSAGE
            : FLAG_TRANSFER_CANCELLED_TARGET_MESSAGE;
        this.notifications.showMoveError(message);
    }

    private isEligibleTarget(target: Player, currentPlayer: Player): boolean {
        if (!target.id || target.id === currentPlayer.id) return false;
        if (target.team !== currentPlayer.team) return false;
        if (target.remainingActions === PLAYER_ABANDONED_FLAG) return false;
        if (!currentPlayer.hasFlag && !target.hasFlag) return false;
        if (!currentPlayer.position) return false;
        return this.isAdjacentPosition(currentPlayer.position, target.position);
    }

    private isAdjacentPosition(positionA: Position, positionB?: Position): boolean {
        if (!positionB) return false;
        const deltaX = Math.abs(positionA.x - positionB.x);
        const deltaY = Math.abs(positionA.y - positionB.y);
        return (deltaX === 1 && deltaY === 0) || (deltaX === 0 && deltaY === 1);
    }
}
