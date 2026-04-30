import { NEIGHBOR_DISTANCE, SAME_AXIS_DISTANCE, TEAM_SPLIT_DIVISOR } from '@app/constants/ctf.constants';
import { CTFMatch } from '@app/model/match-models/ctf-match/ctf-match';
import { MatchService } from '@app/services/match/match-session/match.service';
import { Team } from '@common/enum/player/player.enum';
import { CreateMatchParams } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { Injectable } from '@nestjs/common';


@Injectable()
export class MatchCTFService extends MatchService {

    override async createMatch(payload: CreateMatchParams): Promise<void> {
        const players = this.assignTeams(payload.players);
        return super.createMatch({ ...payload, players });
    }

    isSameTeam(firstPlayerId: string, secondPlayerId: string, match: CTFMatch): boolean {
        const firstPlayer = match.gameState.players.find((player) => player.id === firstPlayerId);
        const secondPlayer = match.gameState.players.find((player) => player.id === secondPlayerId);
        if (!firstPlayer?.team || !secondPlayer?.team) return false;
        return firstPlayer.team === secondPlayer.team;
    }

    requestFlagTransfer(requesterId: string, targetId: string, match: CTFMatch): { valid: boolean; remainingActions?: number } {
        const requester = match.gameState.players.find((player) => player.id === requesterId);
        const target = match.gameState.players.find((player) => player.id === targetId);

        if (!requester || !target) return { valid: false };
        if ((requester.remainingActions ?? 0) <= 0) return { valid: false };
        if (!this.isSameTeam(requesterId, targetId, match)) return { valid: false };
        if (!this.areAdjacent(requester, target)) return { valid: false };
        if (match.pendingTransfer) return { valid: false };

        const requesterHasFlag = requester.hasFlag;
        const targetHasFlag = target.hasFlag;
        if (!requesterHasFlag && !targetHasFlag) return { valid: false };

        requester.remainingActions--;
        match.pendingTransfer = { requesterId, targetId };
        return { valid: true, remainingActions: requester.remainingActions };
    }

    respondFlagTransfer(responderId: string, accepted: boolean, match: CTFMatch): { success: boolean; fromId?: string; toId?: string } {
        if (!match.pendingTransfer || match.pendingTransfer.targetId !== responderId) return { success: false };

        const { requesterId, targetId } = match.pendingTransfer;
        match.pendingTransfer = null;

        if (!accepted) return { success: false };

        const requester = match.gameState.players.find((player) => player.id === requesterId);
        const target = match.gameState.players.find((player) => player.id === targetId);

        if (!requester || !target) return { success: false };

        const flagHolder = requester.hasFlag ? requester : target;
        const flagReceiver = requester.hasFlag ? target : requester;

        if (!flagHolder.hasFlag) return { success: false };

        flagHolder.hasFlag = false;
        flagReceiver.hasFlag = true;
        match.flagHolderId = flagReceiver.id ?? null;
        match.trackFlagHolder(flagReceiver.id);

        const winner = match.checkWinCondition();
        if (winner) match.endCTFGame(winner);

        return { success: true, fromId: flagHolder.id, toId: flagReceiver.id };
    }

    private assignTeams(players: Player[]): Player[] {
        const shuffledPlayers = this.shufflePlayers(players);
        const teamSize = Math.floor(shuffledPlayers.length / TEAM_SPLIT_DIVISOR);
        for (let i = 0; i < shuffledPlayers.length; i++) {
            shuffledPlayers[i].team = i < teamSize ? Team.RED : Team.BLUE;
        }
        return shuffledPlayers;
    }

    private shufflePlayers(players: Player[]): Player[] {
        const shuffledPlayers = [...players];
        for (let i = shuffledPlayers.length - 1; i > 0; i--) {
            const randomIndex = Math.floor(Math.random() * (i + 1));
            [shuffledPlayers[i], shuffledPlayers[randomIndex]] = [shuffledPlayers[randomIndex], shuffledPlayers[i]];
        }
        return shuffledPlayers;
    }

    private areAdjacent(firstPlayer: Player, secondPlayer: Player): boolean {
        if (!firstPlayer.position || !secondPlayer.position) return false;
        const deltaX = Math.abs(firstPlayer.position.x - secondPlayer.position.x);
        const deltaY = Math.abs(firstPlayer.position.y - secondPlayer.position.y);
        return (deltaX === NEIGHBOR_DISTANCE && deltaY === SAME_AXIS_DISTANCE)
            || (deltaX === SAME_AXIS_DISTANCE && deltaY === NEIGHBOR_DISTANCE);
    }
}
