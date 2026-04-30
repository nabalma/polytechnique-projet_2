import { MAX_DELAY_MS, MIN_DELAY_MS } from '@app/constants/virtual-player.constants';
import { Match } from '@app/model/match-models/base-match/match';
import { VirtualPlayerAction } from '@app/model/virtual-player/action/virtual-player-action';
import { VirtualPlayerBehavior } from '@app/services/match/virtual-player/virtual-player-behavior';
import { VirtualPlayerActionType } from '@common/enum/match/virtual-player.enum';
import { SanctuaryInteractionMode } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { VirtualPlayerContext } from './context/virtual-player-context';

export class VirtualTurnManager {

    private readonly match: Match;
    private readonly player: Player;

    constructor(
        private readonly behavior: VirtualPlayerBehavior,
        private readonly context: VirtualPlayerContext,
    ) {
        this.match = context.getMatch();
        this.player = context.getPlayer();
    }

    async executeTurn(): Promise<void> {
        if (this.isMyTurn() && this.context.hasNoAvailableActions()) {
            this.match.endTurn(this.player.id);
            return;
        }
        while (!this.context.hasNoAvailableActions()) {
            await this.randomDelay();
            if (!this.isMyTurn()) return;
            const action = this.behavior.chooseAction(this.context);
            if (action.type === VirtualPlayerActionType.EndTurn) {
                this.match.endTurn(this.player.id);
                return;
            }
            this.executeAction(action);

        }
        if (!this.isMyTurn()) return;
        await this.randomDelay();
        this.match.endTurn(this.player.id);
    }

    private isMyTurn(): boolean {
        return !this.match.isGameEnd && this.match.isActivePlayer(this.player.id);
    }

    private randomDelay(): Promise<void> {
        const delay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
        return new Promise((resolve) => setTimeout(resolve, delay));
    }

    private executeSanctuaryAction(playerId: string, sanctuaryPosition: Position): void {
        this.match.requestSanctuaryInteraction(playerId, {
            sanctuaryPosition,
            mode: SanctuaryInteractionMode.Normal,
        });
    }

    private executeAttackAction(playerId: string, targetPlayerId: string): void {
        this.match.requestCombat(playerId, { targetPlayerId });
    }

    private executeAction(action: VirtualPlayerAction): void {
        const playerId = this.context.getPlayer().id;

        switch (action.type) {
            case VirtualPlayerActionType.Move:
                this.match.requestMove(playerId, { targetPosition: action.target });
                break;
            case VirtualPlayerActionType.Attack:
                this.executeAttackAction(playerId, action.target);
                break;
            case VirtualPlayerActionType.ToggleDoor:
                this.match.toggleDoor(this.match.gameState, action.target);
                break;
            case VirtualPlayerActionType.Sanctuary:
                this.executeSanctuaryAction(playerId, action.target);
                break;
            case VirtualPlayerActionType.Posture:
                break;
        }
    }
}
