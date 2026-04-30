import { inject, Injectable, signal } from '@angular/core';
import { GameEndStatsPayload } from '@common/interfaces/game-end/game-end-stats-payload.interface';
import { GameLogEntry } from '@common/interfaces/game-log/game-log-entry.interface';
import { LogService } from '@app/services/logs/logs.service';

@Injectable({ providedIn: 'root' })
export class EndGameStateService {
    private readonly _stats = signal<GameEndStatsPayload | null>(null);
    private readonly _winnerId = signal<string>('');
    private readonly _winnerName = signal<string>('');
    private readonly _winnerTeam = signal<string>('');
    private readonly _winnerTeamPlayers = signal<string[]>([]);
    private readonly _gameId = signal<string>('');
    private readonly _playerName = signal<string>('');
    private readonly _logEntries = signal<GameLogEntry[]>([]);
    private readonly _preserveChat = signal<boolean>(false);

    readonly stats = this._stats.asReadonly();
    readonly winnerId = this._winnerId.asReadonly();
    readonly winnerName = this._winnerName.asReadonly();
    readonly winnerTeam = this._winnerTeam.asReadonly();
    readonly winnerTeamPlayers = this._winnerTeamPlayers.asReadonly();
    readonly gameId = this._gameId.asReadonly();
    readonly playerName = this._playerName.asReadonly();
    readonly logEntries = this._logEntries.asReadonly();
    readonly preserveChat = this._preserveChat.asReadonly();

    readonly logService = inject(LogService);

    setEndGame(data: {
        stats: GameEndStatsPayload;
        winnerId: string;
        winnerName: string;
        winnerTeam?: string;
        winnerTeamPlayers?: string[];
        gameId: string;
        playerName: string;
        logEntries: GameLogEntry[];
    }): void {
        this._stats.set(data.stats);
        this._winnerId.set(data.winnerId);
        this._winnerName.set(data.winnerName);
        this._winnerTeam.set(data.winnerTeam ?? '');
        this._winnerTeamPlayers.set(data.winnerTeamPlayers ?? []);
        this._gameId.set(data.gameId);
        this._playerName.set(data.playerName);
        this._logEntries.set(this.logService.logs());
        this._preserveChat.set(true);
    }

    clear(): void {
        this._stats.set(null);
        this._winnerId.set('');
        this._winnerName.set('');
        this._winnerTeam.set('');
        this._winnerTeamPlayers.set([]);
        this._gameId.set('');
        this._playerName.set('');
        this._logEntries.set([]);
        this._preserveChat.set(false);
        this.logService.clearLogs();
    }
}
