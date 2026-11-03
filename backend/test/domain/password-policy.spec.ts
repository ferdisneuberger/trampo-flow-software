import { describe, expect, it } from 'vitest';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { assertPasswordPolicy } from '../../src/domain/users/services/password-policy';

describe('assertPasswordPolicy', () => {
  it('aceita senha com 8 ou mais caracteres', () => {
    expect(() => assertPasswordPolicy('a'.repeat(8))).not.toThrow();
  });

  it('recusa senha curta', () => {
    expect(() => assertPasswordPolicy('a'.repeat(7))).toThrow(DomainError);
    expect(() => assertPasswordPolicy('a'.repeat(7))).toThrow(
      /pelo menos 8 caracteres/,
    );
  });

  it('recusa senha acima de 256 caracteres', () => {
    expect(() => assertPasswordPolicy('a'.repeat(257))).toThrow(
      /no máximo 256 caracteres/,
    );
  });
});
