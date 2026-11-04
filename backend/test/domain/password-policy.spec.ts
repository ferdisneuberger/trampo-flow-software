import { describe, expect, it } from 'vitest';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { assertPasswordPolicy } from '../../src/domain/users/services/password-policy';

function expectPolicyError(
  password: string,
  code: string,
  message: RegExp,
): void {
  try {
    assertPasswordPolicy(password);
    throw new Error('Esperava uma violação da política de senha.');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    expect((error as Error).message).toMatch(message);
  }
}

describe('assertPasswordPolicy', () => {
  it('aceita senha com tamanho mínimo, maiúscula, número e especial', () => {
    expect(() => assertPasswordPolicy('Abcdef1!')).not.toThrow();
  });

  it('recusa senha curta', () => {
    expectPolicyError('Ab1!', 'PASSWORD_TOO_SHORT', /pelo menos 8 caracteres/);
  });

  it('recusa senha sem letra maiúscula', () => {
    expectPolicyError('abcdefg1!', 'PASSWORD_MISSING_UPPERCASE', /maiúscula/);
  });

  it('recusa senha sem número', () => {
    expectPolicyError('Abcdefgh!', 'PASSWORD_MISSING_NUMBER', /número/);
  });

  it('recusa senha sem caractere especial', () => {
    expectPolicyError('Abcdefg1', 'PASSWORD_MISSING_SPECIAL', /especial/);
  });

  it('recusa senha acima de 256 caracteres', () => {
    expect(() => assertPasswordPolicy(`A1!${'a'.repeat(254)}`)).toThrow(
      /no máximo 256 caracteres/,
    );
  });
});
