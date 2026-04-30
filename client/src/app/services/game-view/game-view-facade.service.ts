import { inject, Injectable, Signal } from '@angular/core';
import { ChatStateService } from '@app/services/chat/chat-state.service';
import { CombatService } from '@app/services/combat/combat.service';
import { DebugModeService } from '@app/services/debug-mode/debug-mode.service';
import { GameActionService } from '@app/services/match/action/game-action.service';
import { MovementService } from '@app/services/match/movement/movement.service';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import { GameOverPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { ChatEvents } from '@common/socket_event/chat/chat.gateway.events';
import { WaitingRoomEvents } from '@common/socket_event/waiting-room/waiting-room.gateway.events';
import { GameOverHandlerService } from './game-over-handler.service';
import { TimerDisplayService } from './timer-display.service';

@Injectable({ providedIn: 'root' })
export class GameViewFacadeService {
    private readonly chatState = inject(ChatStateService);
    private readonly socketService = inject(MatchSocketService);
    private readonly debugModeService = inject(DebugModeService);
    private readonly movementService = inject(MovementService);
    private readonly gameActionService = inject(GameActionService);
    private readonly gameOverHandler = inject(GameOverHandlerService);
    private readonly timerDisplayService = inject(TimerDisplayService);
    private readonly combatService = inject(CombatService);

    get isChatFocused(): boolean {
        return this.chatState.isOnFocus;
    }

    get timerLabel(): string {
        return this.timerDisplayService.label;
    }

    get timerDisplay(): string {
        return this.timerDisplayService.display;
    }

    get isTimerLow(): boolean {
        return this.timerDisplayService.isLow;
    }

    get isLocalPlayerInCombat(): Signal<boolean> {
        return this.combatService.isLocalPlayerInCombat;
    }

    resetChat(): void {
        this.chatState.reset();
    }

    sendLeaveRoom(gameId: string): void {
        this.socketService.send(ChatEvents.LeaveRoom, gameId);
        this.socketService.send(WaitingRoomEvents.LeaveRoom, gameId);
    }

    requestTeleport(position: Position): void {
        this.debugModeService.requestTeleport(position);
    }

    handleMovement(key: string): void {
        this.movementService.handleMovement(key);
    }

    handleCellClick(flatIndex: number): void {
        this.gameActionService.handleCellClick(flatIndex);
    }

    handleGameOver(data: GameOverPayload, gameId: string, playerName: string, players: Map<string, Player>): void {
        this.gameOverHandler.handle(data, gameId, playerName, players);
    }

    onGameOverClosed(data: GameOverPayload | null): void {
        this.gameOverHandler.onClosed(data);
    }

    registerCombatListeners(): void {
        this.combatService.registerListeners();
    }

    resetCombatState(): void {
        this.combatService.isInCombat.set(false);
        this.combatService.combatResult.set(null);
    }

    startCombat(): void {
        this.combatService.startCombat();
    }
}
