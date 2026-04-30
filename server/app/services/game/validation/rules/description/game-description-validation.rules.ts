import { GameValidationError } from '@app/constants/game-validation.constants';

export function validateDescription(description?: string): GameValidationError | undefined {
  if (!description) return;

  const value = description.trim();
  if (!value) return GameValidationError.EmptyDescription;

}