import { GameValidationError } from '@app/constants/game-validation.constants';

export function validateImageUrl(imageUrl?: string): GameValidationError | undefined {
  if (!imageUrl) return;

  const value = imageUrl.trim();
  if (!value) return GameValidationError.ImageUrlEmpty;

  try {
    const regex = /^LOG2995\/client\/[a-zA-Z0-9_.-]+$/;
    if (!regex.test(value)) return GameValidationError.ImageUrlPublicId;

  } catch {
    return GameValidationError.ImageUrlPublicIdError;
  }
}