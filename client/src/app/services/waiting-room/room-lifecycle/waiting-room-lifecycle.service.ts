import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ChatStateService } from '@app/services/chat/chat-state.service';
import { JoinWaitingRoomState } from '@app/services/join-waiting-room/join-waiting-room.service';
import { NavigationStateService } from '@app/services/navigation/navigation-state.service';
import { WaitingRoomStateService } from '@app/services/waiting-room/room-state/waiting-room-state.service';
import { WaitingRoomSocketService } from '@app/services/waiting-room/socket-service/waiting-room-socket.service';
import { DEFAULT_MAX_PLAYERS } from '@common/constants/waiting-room/waiting-room.consts';
import { WaitingRoomNavState } from '@common/interfaces/navigation/navigation-state-interfaces';
import { Player } from '@common/interfaces/player/player-interface';

@Injectable({ providedIn: 'root' })
export class WaitingRoomLifecycleService {
    /* eslint-disable max-params  */
    /* Nous avons besoin de tout ces contructeurs pour pouvoir faire fonctionner le component */
    constructor(
        private readonly stateService: WaitingRoomStateService,
        private readonly socketService: WaitingRoomSocketService,
        private readonly router: Router,
        private readonly navigationState: NavigationStateService,
        private readonly chatState: ChatStateService,
        private readonly joinState: JoinWaitingRoomState,
    ) {}

    initialize(): void {
        const navState = this.navigationState.getState<WaitingRoomNavState>();
        const player = this.resolvePlayer(navState);

        if (player && this.socketService.socketId) {
            this.socketService.reinitialize();
            this.initPlayer(player, navState?.playerId);
        } else {
            this.router.navigate(['/home']);
        }
    }

    leave(roomId: string): void {
        this.socketService.leaveRoom(roomId);
        this.cleanup();
        this.router.navigate(['/home']);
    }

    cleanup(): void {
        this.stateService.reset();
        this.chatState.reset();
        this.joinState.setWaitingRoom('', [], '');
        this.socketService.disconnect();
    }

    private resolvePlayer(navState: WaitingRoomNavState): Player | null {
        if (navState?.player) return navState.player;
        return this.navigationState.getFromLocalStorage<Player>('currentPlayer');
    }

    private initPlayer(player: Player, playerId?: string): void {
        this.stateService.setCurrentPlayer(player);
        this.stateService.setRoom({
            players: [player],
            isLocked: false,
            maxPlayers: DEFAULT_MAX_PLAYERS,
            organizerId: '',
        });

        if (player.isOrganizer && this.joinState.gameIdRoom) {
            this.socketService.createRoom(player, this.joinState.gameIdRoom);
        } else if (!player.isOrganizer && this.joinState.roomIdGame) {
            this.stateService.setRoomId(this.joinState.roomIdGame);
            if (playerId) this.stateService.setCurrentPlayerId(playerId);
        }
    }
}
