import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { BackgroundImageComponent } from '@app/components/common-component/background-image/background-image.component';
import { ChatBoxComponent } from '@app/components/common-component/chat-box/chat-box.component';
import { WaitingPlayerListComponent } from '@app/components/waiting-room/player-list/player-list.component';

import { GameRulesModalComponent } from '@app/components/game-view/game-rules-modal/game-rules-modal.component';
import { WaitingRoomLifecycleService } from '@app/services/waiting-room/room-lifecycle/waiting-room-lifecycle.service';
import { WaitingRoomStateService } from '@app/services/waiting-room/room-state/waiting-room-state.service';
import { WaitingRoomSocketService } from '@app/services/waiting-room/socket-service/waiting-room-socket.service';
import { WAITING_ROOM_MESSAGES } from '@common/constants/waiting-room/waiting-room-messages.consts';
import { DEFAULT_MAX_PLAYERS } from '@common/constants/waiting-room/waiting-room.consts';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { Player } from '@common/interfaces/player/player-interface';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BotProfile } from '@common/interfaces/types';

@Component({
    selector: 'app-waiting-room-view-page',
    standalone: true,
    imports: [ChatBoxComponent, WaitingPlayerListComponent, BackgroundImageComponent, MatTooltipModule, GameRulesModalComponent],
    templateUrl: './waiting-room-view-page.component.html',
    styleUrl: './waiting-room-view-page.component.scss',
})
export class WaitingRoomViewPageComponent implements OnInit, OnDestroy {
    constructor(
        private readonly stateService: WaitingRoomStateService,
        private readonly socketService: WaitingRoomSocketService,
        private readonly lifecycle: WaitingRoomLifecycleService,
        private readonly elementRef: ElementRef,
    ) {}

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.isVirtualPlayerChooserOpen) return;
        const wrapper = this.elementRef.nativeElement.querySelector('.virtual-player-wrapper');
        if (wrapper && !wrapper.contains(event.target as Node)) {
            this.isVirtualPlayerChooserOpen = false;
        }
    }

    ngOnInit(): void {
        this.lifecycle.initialize();
    }

    ngOnDestroy(): void {
        if (!this.socketService.isGameStarting && this.roomId) {
            this.socketService.leaveRoom(this.roomId);
            this.lifecycle.cleanup();
        }
    }
    protected isVirtualPlayerChooserOpen = false;
    showRulesModal = false;
    get players(): Player[] {
        return this.stateService.players();
    }

    get organizerId(): string {
        return this.stateService.organizerId();
    }

    get currentPlayerId(): string {
        return this.stateService.currentPlayerId();
    }

    get roomId(): string {
        return this.stateService.roomId();
    }

    get isLocked(): boolean {
        return this.stateService.isLocked();
    }

    get maxPlayers(): number {
        return this.stateService.maxPlayers();
    }

    readonly isAbandoned: boolean = false;

    get playerName(): string {
        const foundPlayer = this.players.find((player) => player.id === this.currentPlayerId);
        return foundPlayer?.name ?? this.stateService.currentPlayer()?.name ?? 'Joueur';
    }

    get gameMode(): GameMode {
        return this.stateService.gameMode();
    }

    get canStart(): boolean {
        const isOrganizer = this.currentPlayerId === this.organizerId;
        const hasMinPlayers = this.players.length >= DEFAULT_MAX_PLAYERS;
        if (this.gameMode === GameMode.CTF) {
            return isOrganizer && hasMinPlayers && this.players.length % 2 === 0;
        }
        return isOrganizer && hasMinPlayers;
    }

    get isRoomFull(): boolean {
        return this.players.length >= this.maxPlayers;
    }

    get ctfOddPlayerWarning(): boolean {
        return this.gameMode === GameMode.CTF && this.players.length % 2 !== 0;
    }

    get ctfOddPlayerMessage(): string {
        return WAITING_ROOM_MESSAGES.CTF_ODD_PLAYERS(this.players.length);
    }

    onKickPlayer(playerId: string): void {
        this.socketService.kickPlayer(this.roomId, playerId);
    }

    onStartGame(): void {
        this.socketService.startGame(this.roomId);
    }


    onCreateVirtualPlayer(): void {
        this.isVirtualPlayerChooserOpen = !this.isVirtualPlayerChooserOpen;
    }

    onLeave(): void {
        this.lifecycle.leave(this.roomId);
    }


    onSelectAggressiveVirtualPlayer(): void {
        this.socketService.addVirtualPlayer(this.roomId, BotProfile.AGGRESSIVE);
        this.isVirtualPlayerChooserOpen = false;
    }

    onSelectDefensiveVirtualPlayer(): void {
        this.socketService.addVirtualPlayer(this.roomId, BotProfile.DEFENSIVE);
        this.isVirtualPlayerChooserOpen = false;
    }

}

