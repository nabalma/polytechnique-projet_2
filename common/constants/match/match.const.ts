import { MovementKeys } from "../../enum/movement/movement-service.enum";

export const NB_ADJACENT_CELLS = 4;
export const DEFAULT_STARTING_POINTS: number[] = [33, 73, 155, 163];
export const MOVEMENTS: Record<string, { dx: number, dy: number }> = {
    [MovementKeys.left]: { dx: -1, dy: 0 },
    [MovementKeys.right]: { dx: 1, dy: 0 },
    [MovementKeys.up]: { dx: 0, dy: -1 },
    [MovementKeys.down]: { dx: 0, dy: 1 },
};
export const COMBAT_TIMER_MAX = 10;
export const DASH_TOTAL = 100;
export const MAX_D4_VALUE = 4;
export const MIN_DICE_VALUE = 1;
export const MAX_D6_VALUE = 6;
export const POSTURE_BONUS = 2;
export const ICE_COMBAT_PENALTY = 2;
export const COMBAT_RESULT_DISMISS_MS = 3000;