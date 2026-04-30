
export enum DiceType {
    D4 = 'D4',
    D6 = 'D6',
}

export enum BotProfile {
    AGGRESSIVE = 'AGGRESSIVE',
    DEFENSIVE = 'DEFENSIVE',
}

export type Avatar = string;

export interface TimerInterrupt {
    name: string,
    value: number,
}