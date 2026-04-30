import { PLAYER_ABANDONED_FLAG } from '@common/constants/game-view/game-view.constants';
import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { Position } from '@common/interfaces/match/match-interface';
import { MiniPlayerInfo, Player, PlayerSnapshot } from '@common/interfaces/player/player-interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerService {
    private players: Map<string, Player> = new Map();

    remove(playerId: string): string {
        if (!this.players.has(playerId))
            return '';
        const roomId = this.players.get(playerId)?.roomId;
        this.players.delete(playerId);
        return roomId;
    }

    getRoomId(playerId: string): string {
        return this.players.get(playerId).roomId || '';
    }

    getPlayerSnapShot(playerId: string): PlayerSnapshot {
        let player: PlayerSnapshot;
        if (!this.players.has(playerId))
            return player;
        const { name, avatar, flatPos } = this.players.get(playerId);
        return {
            name,
            id: playerId,
            avatar,
            position: flatPos,
        };
    }

    getPlayerFlatPost(playerId: string): number {
        return this.players.get(playerId).flatPos ?? null;
    }

    setPlayerPosition(playerId: string, to: Position): boolean {
        if (!this.players.has(playerId))
            return false;
        this.players.get(playerId).position = to;
        return true;
    }
    setPlayerFlatPos(playerId: string, to: number): boolean {
        if (!this.players.has(playerId))
            return false;
        this.players.get(playerId).flatPos = to;
        return true;
    }
    getPlayerById(playerId: string) {
        return this.players.get(playerId);
    }

    abandonPlayer(state: GameState, playerId: string): Player | undefined {
        const target = state.players.find((player) => player.id === playerId);
        if (target?.isVirtual) return undefined;
        if (target?.remainingActions === PLAYER_ABANDONED_FLAG) return undefined;
        let abandonedPlayer: Player | undefined;
        state.players = state.players.map(player => {
            if (player.id !== playerId) return player;
            abandonedPlayer = { ...player, remainingActions: -1, isActive: false };
            return abandonedPlayer;
        });
        if (!abandonedPlayer) return abandonedPlayer;
        const cell = state.grid[abandonedPlayer.startPosition.y]?.[abandonedPlayer.startPosition.x];
        if (cell?.objects?.objectType === ObjectType.START_POINT) cell.objects = undefined;
        return abandonedPlayer;
    }

    addPlayer(player: MiniPlayerInfo, id: string, roomId: string, isOrganizer: boolean = false): Player {
        const mPlayer: Player = {
            ...player,
            id,
            roomId,
            isOrganizer,
            isActive: true,
            remainingMovement: player.attributes.speed,
            remainingActions: 0,
            hasFlag: false,
            wins: 0,
        };
        this.players.set(id, mPlayer);
        return mPlayer;
    }
}