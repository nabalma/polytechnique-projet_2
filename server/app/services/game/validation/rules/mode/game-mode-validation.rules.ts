import { GameValidationError } from '@app/constants/game-validation.constants';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';

export function validateMode(mode?: GameMode): GameValidationError | undefined {
  if (!mode) return;

  const allowed = new Set<GameMode>([GameMode.CLASSIC, GameMode.CTF]);
  if (!allowed.has(mode)) return GameValidationError.ModeInvalid;
}