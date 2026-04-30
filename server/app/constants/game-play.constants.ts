/* eslint-disable  -- On conserve ce nom pour respecter une convention métier partagée.*/

export const TURN_DURATION_MS = 30_000;
export const TURN_DELAY_MS = 3_000;
export const TIMER_TICK_MS = 1_000;
export const WINS_TO_END = 3;
export const SORT_RANDOM_PIVOT = 0.5;
export const COMBAT_START_DELAY_MS = 3_000;

export const PERCENT = 100;

export const ICE_COMBAT_PENALTY = 2;

export const TILE_COSTS: Record<string, number> = {
    DEFAULT: 1,
    WATER: 2,
    ICE: 0,
    DOOR_OPEN: 1,
};
