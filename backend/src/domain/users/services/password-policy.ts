import { DomainError } from '../../shared/errors/domain.error';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 256;

const PASSWORD_UPPERCASE_PATTERN = /\p{Lu}/u;
const PASSWORD_NUMBER_PATTERN = /\p{Nd}/u;
const PASSWORD_SPECIAL_PATTERN = /[\p{P}\p{S}]/u;

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

  if (!PASSWORD_UPPERCASE_PATTERN.test(password)) {
    throw new DomainError(
      'A senha deve conter pelo menos uma letra maiúscula.',
      'PASSWORD_MISSING_UPPERCASE',
    );
  }

  if (!PASSWORD_NUMBER_PATTERN.test(password)) {
    throw new DomainError(
      'A senha deve conter pelo menos um número.',
      'PASSWORD_MISSING_NUMBER',
    );
  }

  if (!PASSWORD_SPECIAL_PATTERN.test(password)) {
    throw new DomainError(
      'A senha deve conter pelo menos um caractere especial.',
      'PASSWORD_MISSING_SPECIAL',
    );
  }
}
