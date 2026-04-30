import { computed, Injectable, signal } from '@angular/core';
import { DEFAULT_MAX_PLAYERS } from '@common/constants/waiting-room/waiting-room.consts';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { Player } from '@common/interfaces/player/player-interface';
import { RoomPayload } from '@common/interfaces/waiting-room/waiting-room-interface';

@Injectable({ providedIn: 'root' })
export class WaitingRoomStateService {
    private readonly _players = signal<Player[]>([]);
    private readonly _organizerId = signal<string>('');
    private readonly _isLocked = signal<boolean>(false);
    private readonly _maxPlayers = signal<number>(DEFAULT_MAX_PLAYERS);
    private readonly _roomId = signal<string>('');
    private readonly _currentPlayer = signal<Player | null>(null);
    private readonly _currentPlayerId = signal<string>('');
    private readonly _gameDbId = signal<string>('');
    private readonly _gameMode = signal<GameMode>(GameMode.CLASSIC);
    private readonly _gameName = signal<string>('');
    readonly players = this._players.asReadonly();
    readonly organizerId = this._organizerId.asReadonly();
    readonly isLocked = this._isLocked.asReadonly();
    readonly maxPlayers = this._maxPlayers.asReadonly();
    readonly roomId = this._roomId.asReadonly();
    readonly currentPlayer = this._currentPlayer.asReadonly();
    readonly currentPlayerId = this._currentPlayerId.asReadonly();
    readonly gameDbId = this._gameDbId.asReadonly();
    readonly gameMode = this._gameMode.asReadonly();
    readonly gameName = this._gameName.asReadonly();

    readonly playerCount = computed(() => this._players().length);
    readonly isFull = computed(() => this._players().length >= this._maxPlayers());

    setRoom(payload: RoomPayload): void {
        this._players.set(payload.players);
        this._isLocked.set(payload.isLocked);
        this._maxPlayers.set(payload.maxPlayers);
        this._organizerId.set(payload.organizerId);
        if (payload.gameMode !== undefined) this._gameMode.set(payload.gameMode);
        if (payload.gameName !== undefined) this._gameName.set(payload.gameName);
    }

    setRoomId(roomId: string): void {
        this._roomId.set(roomId);
    }

    setCurrentPlayer(player: Player): void {
        this._currentPlayer.set(player);
    }

    setCurrentPlayerId(id: string): void {
        this._currentPlayerId.set(id);
    }

    addPlayer(player: Player): void {
        this._players.update((list) => [...list, player]);
    }

    removePlayer(playerId: string): void {
        this._players.update((list) => list.filter((player) => player.id !== playerId));
    }

    setLocked(locked: boolean): void {
        this._isLocked.set(locked);
    }

    setGameDbId(gameId: string): void {
        this._gameDbId.set(gameId);
    }

    reset(): void {
        this._players.set([]);
        this._organizerId.set('');
        this._isLocked.set(false);
        this._maxPlayers.set(DEFAULT_MAX_PLAYERS);
        this._roomId.set('');
        this._currentPlayer.set(null);
        this._currentPlayerId.set('');
        this._gameDbId.set('');
        this._gameMode.set(GameMode.CLASSIC);
        this._gameName.set('');
    }
}
