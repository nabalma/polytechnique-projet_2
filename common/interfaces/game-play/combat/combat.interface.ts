import { Position } from '@common/interfaces/match/match-interface';

export interface CombatResultPayload {
    initiatorId: string;
    opponentId: string;
    attackRoll?: number;
    defenseRoll?: number;
    damageDealt?: number;
    opponentCurrentLife?: number;
    opponentEliminated?: boolean;
}


export interface CombatEndedPayload {
    winnerId: string;
    loserId: string;
    loserRespawnPosition: Position | null;
}

export interface CombatStartedPayload {
    initiatorId: string;
    opponentId: string;
}

export interface LogAttackDefense {
    base: number,
    bonusPosture: number,
    diceResult: number,
    penalty?: number,
    total: number,
}




export interface LogCombat {
    attackInformation: LogAttackDefense,
    defenseInformation: LogAttackDefense,
    differenceAttackDefense: number,
    hasDamage?: boolean,
    damageReceived?: number,
    playerId: string;
}

export interface CombatStartedSocketPayload {
    initiatorId: string;
    oponentId: string;
}

export interface CombatParticipantNames {
    winnerName: string;
    loserName: string;
}