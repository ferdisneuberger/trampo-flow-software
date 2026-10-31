import { DomainError } from '../errors/domain.error';

export type RequiredTextValidation = {
  field: string;
  maxLength: number;
  requiredCode: string;
  tooLongCode: string;
};

export function normalizeRequiredText(
  value: unknown,
  options: RequiredTextValidation,
): string {
  const { field, maxLength, requiredCode, tooLongCode } = options;

  if (typeof value !== 'string') {
    throw new DomainError(`${field} is required.`, requiredCode);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new DomainError(`${field} is required.`, requiredCode);
  }

  if (normalized.length > maxLength) {
    throw new DomainError(
      `${field} must be at most ${maxLength} characters long.`,
      tooLongCode,
    );
  }

  return normalized;
}
