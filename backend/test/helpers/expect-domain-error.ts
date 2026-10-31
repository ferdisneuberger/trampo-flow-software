import { expect } from 'vitest';
import { DomainError } from '../../src/domain/shared/errors/domain.error';

export function expectDomainError(
  callback: () => unknown,
  code: string,
): void {
  try {
    callback();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }

  throw new Error(
    `Expected a DomainError with code "${code}", but nothing was thrown.`,
  );
}
