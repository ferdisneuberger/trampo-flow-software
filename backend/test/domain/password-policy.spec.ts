import { describe, expect, it } from 'vitest';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { assertPasswordPolicy } from '../../src/domain/users/services/password-policy';

describe('assertPasswordPolicy', () => {
  it('aceita senha com 12 ou mais caracteres', () => {
    expect(() => assertPasswordPolicy('a'.repeat(12))).not.toThrow();
  });

  it('recusa senha curta', () => {
    expect(() => assertPasswordPolicy('a'.repeat(11))).toThrow(DomainError);
    expect(() => assertPasswordPolicy('a'.repeat(11))).toThrow(
      /pelo menos 12 caracteres/,
    );
  });

  it('recusa senha acima de 256 caracteres', () => {
    expect(() => assertPasswordPolicy('a'.repeat(257))).toThrow(
      /no máximo 256 caracteres/,
    );
  });
});
