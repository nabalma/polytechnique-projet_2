import { WINS_TO_END } from '@app/constants/game-play.constants';
import { Match } from '@app/model/match-models/base-match/match';
import { AggressiveVirtualPlayerBehavior } from '@app/services/match/virtual-player/agressive/aggressive-virtual-player-behavior';
import { DefensiveVirtualPlayerBehavior } from '@app/services/match/virtual-player/classic/classic-virtual-player-behavior';
import { VirtualPlayerContext } from '@app/services/match/virtual-player/context/virtual-player-context';
import { VirtualTurnManager } from '@app/services/match/virtual-player/virtual-player-turn-manager';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { BotProfile } from '@common/interfaces/types';

export class ClassicMatch extends Match {
    protected override startVirtualPlayerTurn(player: Player): void {
        const behavior = player.botProfile === BotProfile.AGGRESSIVE
            ? new AggressiveVirtualPlayerBehavior()
            : new DefensiveVirtualPlayerBehavior();
        const context = new VirtualPlayerContext(player, this);
        new VirtualTurnManager(behavior, context).executeTurn().catch(() => this.forceEndTurn());
    }

    protected override onCombatOver(
        winnerId: string | null,
        loserId: string | null,
        loserDefeatPosition: Position | null,
        drawDefeatPositions?: Map<string, Position>,
    ): void {
        const gameWinner = this.checkWinCondition();
        if (gameWinner) {
            let participantIds: string[] = [];

            if (winnerId && loserId) {
                participantIds = [winnerId, loserId];
            } else if (drawDefeatPositions) {
                participantIds = [...drawDefeatPositions.keys()];
            }

            this.services.gameStats.trackCombatResult(winnerId, loserId, participantIds, this.gameState);
            this.endGame(gameWinner);
            return;
        }
        super.onCombatOver(winnerId, loserId, loserDefeatPosition, drawDefeatPositions);
    }

    override checkWinCondition(): Player | undefined {
        return this.gameState.players.find(player => player.wins >= WINS_TO_END);
    }
}