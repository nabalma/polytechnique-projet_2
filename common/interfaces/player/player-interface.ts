import { AssignationDice, BonusAttribute, Team } from '@common/enum/player/player.enum';
import { Position } from '../match/match-interface';
import { Avatar, BotProfile, DiceType } from '../types';


export interface CombatBonus {
    attackBonus: number;
    defenseBonus: number;
    expiresOnTurnNumber: number;
}

export interface PlayerSnapshot {
    name: string;
    id: string;
    avatar: string;
    position: number;
}
export interface Character {
    id: string;
    name: string;
    miniSrc: string;
    previewSrc: string;
}

export interface PlayerAttributes {
    totalLife: number;
    currentLife: number;
    speed: number;
    attack: number;
    attackDice: DiceType;
    defense: number;
    defenseDice: DiceType;
}
export interface MiniPlayerInfo {
    id?: string;
    name: string,
    avatarMini: string,
    isVirtual: boolean,
    attributes: PlayerAttributes,
    roomId?: string
}


export interface Player extends MiniPlayerInfo {
    avatar?: Avatar;
    avatarMini: string;
    isActive: boolean;
    botProfile?: BotProfile;
    isOrganizer: boolean;
    remainingMovement: number;
    remainingActions: number;
    position?: Position,
    startPosition?: Position,
    flatPos?: number;
    hasFlag: boolean;
    wins: number;
    team?: Team;
    activeCombatBonus?: CombatBonus;
}

export interface CreationCharacter {
    name: string;
    avatarId: string | null;
    bonus: BonusAttribute;
    d6AssignedTo: AssignationDice;
}

export interface BasePlayerAttribute {
    life: number,
    speed: number,
    attack: number,
    defense: number,
}

