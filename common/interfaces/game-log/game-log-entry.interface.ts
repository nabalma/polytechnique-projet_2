import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { LogCombat } from '@common/interfaces/game-play/combat/combat.interface';

export interface GameLogEntry {
    timestamp: string;
    message: string;
    combatPlayerIds?: string[];
    combatData?: LogCombat;
    attackerName?: string;
    defenderName?: string;
    roundNumber?: number;
}

export interface GameLogPayload {
    playerNameActive: string,
    roomId: string,
    defeatPlayerName?: string,
    date: string,
    combatPlayerIds?: string[],
    sanctuaryType?: ObjectType,
}

export interface EndPartyLogPayload {
    date: string,
    playersName: string[],
    roomId: string,
}
