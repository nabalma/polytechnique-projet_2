export interface PlayerCombatStats {
    combatCount: number;
    victoryCount: number;
    defeatCount: number;
    totalHpLost: number;
    totalHpDealt: number;
}

export interface PlayerEndStats extends PlayerCombatStats {
    playerId: string;
    playerName: string;
    avatarMini: string;
    isAbandoned: boolean;
    visitedTerrainPercent: number;
}
