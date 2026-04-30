import { Injectable, signal, WritableSignal } from '@angular/core';
import { PLAYER_ABANDONED_FLAG } from '@common/constants/game-view/game-view.constants';
import { PlayerMovedPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';

@Injectable({
    providedIn: 'root',
})
export class MatchPlayerService {
    players: WritableSignal<Map<string, Player>> = signal(new Map());
    private _currentPlayerId: WritableSignal<string> = signal('');
    private _activePlayerId: string = '';
    private _isDebugMode: boolean = false;

    get playerInfo(): Player | undefined {
        return this.players().get(this._currentPlayerId());
    }

    get currentPlayer(): Player | null {
        return this.players().get(this._currentPlayerId()) ?? null;
    }

    get activePlayerName(): string {
        return this.players().get(this._activePlayerId)?.name ?? '';
    }

    get activePlayerId(): string {
        return this._activePlayerId;
    }

    get currentPlayerId(): string {
        return this._currentPlayerId();
    }

    set currentPlayerId(id: string) {
        if (!id || !id.trim()) return;
        this._currentPlayerId.set(id);
    }

    get currentPos(): Position | undefined {
        return this.players().get(this._currentPlayerId())?.position;
    }

    get remainingMovement(): number {
        return this.currentPlayer?.remainingMovement ?? 0;
    }

    get isOrganizer(): boolean {
        return this.playerInfo?.isOrganizer ?? false;
    }

    get isDebugMode(): boolean {
        return this._isDebugMode;
    }

    getPlayerName(): string {
        return this.playerInfo?.name ?? '';
    }

    getPlayerCount(): number {
        return this.players().size;
    }

    getAvatar(playerId: string): string {
        return this.players().get(playerId)?.avatarMini ?? '';
    }

    getCurrentPosition(): Position | undefined {
        return this.playerInfo?.position;
    }

    getCurrentFlatPos(): number | undefined {
        return this.playerInfo?.flatPos;
    }

    getPlayerRoomId(): string {
        return this.playerInfo?.roomId ?? '';
    }

    isPlayerOrganizer(): boolean | undefined {
        return this.playerInfo?.isOrganizer;
    }

    findTargetPlayer(position: Position): Player | undefined {
        return [...this.players().values()].find(
            (player) =>
                player.id !== this._currentPlayerId() &&
                player.remainingActions !== -1 &&
                player.position?.x === position.x &&
                player.position?.y === position.y,
        );
    }

    initializePlayers(playersArray: Player[]): void {
        const newMap = new Map<string, Player>();
        for (const player of playersArray) {
            if (player.id) newMap.set(player.id, player);
        }
        this.players.set(newMap);
    }

    setActivePlayerId(id: string): void {
        this._activePlayerId = id;
    }

    setDebugMode(value: boolean): void {
        this._isDebugMode = value;
    }

    handlePlayerMoved(payload: PlayerMovedPayload): void {
        this.players.update((playersMap) => {
            const newMap = new Map(playersMap);
            const player = newMap.get(payload.playerId);
            if (player) {
                newMap.set(payload.playerId, {
                    ...player,
                    position: payload.newPosition,
                    remainingMovement: payload.remainingMovement,
                });
            }
            return newMap;
        });
    }

    updateActiveStates(nextPlayerId: string, remainingMovement: number, remainingActions: number): void {
        this.players.update((playersMap) => {
            const newMap = new Map(playersMap);
            newMap.forEach((player, id) => {
                newMap.set(id, {
                    ...player,
                    isActive: id === nextPlayerId,
                    ...(id === nextPlayerId ? { remainingMovement, remainingActions } : {}),
                });
            });
            return newMap;
        });
    }

    markPlayerAbandoned(playerId: string): void {
        this.players.update((playersMap) => {
            const updatedMap = new Map(playersMap);
            const player = updatedMap.get(playerId);
            if (player) {
                updatedMap.set(playerId, { ...player, remainingActions: PLAYER_ABANDONED_FLAG, isActive: false });
            }
            return updatedMap;
        });
    }

    setPlayerFlag(playerId: string, hasFlag: boolean): void {
        this.players.update((playersMap) => {
            const updatedMap = new Map(playersMap);
            const player = updatedMap.get(playerId);
            if (player) updatedMap.set(playerId, { ...player, hasFlag });
            return updatedMap;
        });
    }

    updatePlayerRemainingActions(playerId: string, remainingActions: number): void {
        this.players.update((playersMap) => {
            const updatedMap = new Map(playersMap);
            const player = updatedMap.get(playerId);
            if (player) updatedMap.set(playerId, { ...player, remainingActions });
            return updatedMap;
        });
    }

    incrementPlayerWins(playerId: string): void {
        this.players.update((playersMap) => {
            const updatedMap = new Map(playersMap);
            const player = updatedMap.get(playerId);
            if (player) updatedMap.set(playerId, { ...player, wins: (player.wins ?? 0) + 1 });
            return updatedMap;
        });
    }

    updatePlayerAfterCombat(playerId: string, currentLife: number, newPosition: Position | null): void {
        this.players.update((playersMap) => {
            const updatedMap = new Map(playersMap);
            const player = updatedMap.get(playerId);
            if (player) {
                updatedMap.set(playerId, {
                    ...player,
                    attributes: { ...player.attributes, currentLife },
                    ...(newPosition ? { position: newPosition } : {}),
                });
            }
            return updatedMap;
        });
    }

    transferFlag(fromPlayerId: string, toPlayerId: string): void {
        this.players.update((playersMap) => {
            const updatedMap = new Map(playersMap);
            const fromPlayer = updatedMap.get(fromPlayerId);
            const toPlayer = updatedMap.get(toPlayerId);
            if (fromPlayer) updatedMap.set(fromPlayerId, { ...fromPlayer, hasFlag: false });
            if (toPlayer) updatedMap.set(toPlayerId, { ...toPlayer, hasFlag: true });
            return updatedMap;
        });
    }

    updatePlayers(players: Player[]) {
        this.players.update((oldMap) => {
            const newMap = new Map(oldMap);
            players.forEach((player) => {
                if (player.id && newMap.has(player.id)) {
                    newMap.set(player.id, player);
                }
            });
            return newMap;
        });
    }
}
