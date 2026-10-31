import { DomainError } from '../errors/domain.error';
import {
  normalizeRequiredText,
  RequiredTextValidation,
} from './text.validation';

export type HttpUrlValidation = RequiredTextValidation & {
  invalidCode: string;
};

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

export function normalizeHttpUrl(
  value: unknown,
  options: HttpUrlValidation,
): string {
  const normalized = normalizeRequiredText(value, options);

  if (!isHttpUrl(normalized)) {
    throw new DomainError(
      `${options.field} must be a valid HTTP or HTTPS URL.`,
      options.invalidCode,
    );
  }

  return normalized;
}
