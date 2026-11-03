import { DomainError } from '../../shared/errors/domain.error';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 256;

/**
 * Valida a senha em texto puro apenas no momento de definir/alterar a senha.
 * O login nunca passa por aqui: ele compara contra o hash armazenado.
 */
export function assertPasswordPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new DomainError(
      `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      'PASSWORD_TOO_SHORT',
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new DomainError(
      `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
      'PASSWORD_TOO_LONG',
    );
  }
}
