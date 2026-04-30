import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ChatStateService } from '@app/services/chat/chat-state.service';
import { MatchService } from '@app/services/match/match.service';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import { WaitingRoomStateService } from '@app/services/waiting-room/room-state/waiting-room-state.service';
import { WAITING_ROOM_MESSAGES } from '@common/constants/waiting-room/waiting-room-messages.consts';
import { GameStatePayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Player } from '@common/interfaces/player/player-interface';
import { BotProfile } from '@common/interfaces/types';
import {
    AddVirtualPlayerPayload,
    CreateRoomPayload,
    JoinRoomPayload,
    KickPlayerPayload,
    OrganizerLeftPayload,
    RemoveVirtualPlayerPayload,
    RoomCreatedPayload,
    RoomUpdatedPayload,
    YouWereKickedPayload,
} from '@common/interfaces/waiting-room/waiting-room-interface';
import { WaitingRoomEvents } from '@common/socket_event/waiting-room/waiting-room.gateway.events';
import { Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WaitingRoomSocketService implements OnDestroy {
    isGameStarting = false;
    private readonly subscriptions: Subscription[] = [];
    isInited = false;

    constructor(
        private readonly socketService: MatchSocketService,
        private readonly stateService: WaitingRoomStateService,
        private readonly chatState: ChatStateService,
        private readonly router: Router,
        private readonly matchService: MatchService,
    ) {
        if (!this.isInited) this.init();
    }

    private init(): void {
        this.subscriptions.push(
            this.subscribeToRoomCreated(),
            this.subscribeToRoomUpdated(),
            this.subscribeToGameStarted(),
            this.subscribeToYouWereKicked(),
            this.subscribeToOrganizerLeft(),
        );
    }

    reinitialize(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        this.subscriptions.length = 0;
        this.init();
    }

    private subscribeToRoomCreated(): Subscription {
        return this.socketService
            .on<RoomCreatedPayload>(WaitingRoomEvents.RoomCreated)
            ?.subscribe((payload) => {
                this.stateService.setRoomId(payload.roomId);
                this.stateService.setCurrentPlayerId(payload.playerId);
            })
            ?? Subscription.EMPTY;
    }

    private subscribeToRoomUpdated(): Subscription {
        return this.socketService.on<RoomUpdatedPayload>(WaitingRoomEvents.RoomUpdated)?.subscribe((payload) => this.stateService.setRoom(payload))
            ?? Subscription.EMPTY;
    }

    private subscribeToGameStarted(): Subscription {
        return this.socketService.on<GameStatePayload>(WaitingRoomEvents.GameStarted)?.subscribe((payload) => {
            this.isGameStarting = true;
            this.matchService.currentPlayerId = this.stateService.currentPlayerId();
            this.matchService.setGameState(payload);
            this.router.navigate(['/game-view-page']);
        }) ?? Subscription.EMPTY;
    }

    private subscribeToYouWereKicked(): Subscription {
        return this.socketService.on<YouWereKickedPayload>(WaitingRoomEvents.YouWereKicked)?.subscribe(() => {
            this.stateService.reset();
            this.chatState.reset();
            this.router.navigate(['/home'], { state: { notification: WAITING_ROOM_MESSAGES.YOU_WERE_KICKED } });
        }) ?? Subscription.EMPTY;
    }

    private subscribeToOrganizerLeft(): Subscription {
        return this.socketService.on<OrganizerLeftPayload>(WaitingRoomEvents.OrganizerLeft)?.subscribe(() => {
            this.stateService.reset();
            this.router.navigate(['/home'], { state: { notification: WAITING_ROOM_MESSAGES.ORGANIZER_LEFT } });
        }) ?? Subscription.EMPTY;
    }

    createRoom(player: Player, gameId: string): void {
        const payload: CreateRoomPayload = { player, gameId };
        this.socketService.send(WaitingRoomEvents.CreateRoom, payload);
    }

    joinRoom(player: Player, roomId: string): void {
        const payload: JoinRoomPayload = { player, roomId };
        this.socketService.send(WaitingRoomEvents.JoinRoom, payload);
    }

    kickPlayer(roomId: string, targetPlayerId: string): void {
        const payload: KickPlayerPayload = { roomId, targetPlayerId };
        this.socketService.send(WaitingRoomEvents.KickPlayer, payload);
    }

    addVirtualPlayer(roomId: string, profile: BotProfile): void {
        const payload: AddVirtualPlayerPayload = { roomId, profile };
        this.socketService.send(WaitingRoomEvents.AddVirtualPlayer, payload);
    }

    removeVirtualPlayer(roomId: string, targetPlayerId: string): void {
        const payload: RemoveVirtualPlayerPayload = { roomId, targetPlayerId };
        this.socketService.send(WaitingRoomEvents.RemoveVirtualPlayer, payload);
    }

    startGame(roomId: string): void {
        this.socketService.send(WaitingRoomEvents.StartGame, roomId);
    }

    leaveRoom(roomId: string): void {
        this.socketService.send(WaitingRoomEvents.LeaveRoom, roomId);
    }

    getAvailableRooms(): void {
        this.socketService.send(WaitingRoomEvents.GetAvailableRooms, undefined);
    }

    get socketId(): string | undefined {
        return this.socketService.id ?? undefined;
    }

    disconnect(): void {
        this.socketService.disconnect();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    }
}
