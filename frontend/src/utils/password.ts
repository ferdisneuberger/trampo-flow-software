export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 256;

export type PasswordRequirementId =
  'length' | 'uppercase' | 'number' | 'special';

export type PasswordRequirement = {
  id: PasswordRequirementId;
  label: string;
  met: boolean;
};

const UPPERCASE_PATTERN = /\p{Lu}/u;
const NUMBER_PATTERN = /\p{Nd}/u;
const SPECIAL_PATTERN = /[\p{P}\p{S}]/u;

export function getPasswordRequirements(
  password: string,
): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'uppercase',
      label: 'Uma letra maiúscula',
      met: UPPERCASE_PATTERN.test(password),
    },
    {
      id: 'number',
      label: 'Um número',
      met: NUMBER_PATTERN.test(password),
    },
    {
      id: 'special',
      label: 'Um caractere especial',
      met: SPECIAL_PATTERN.test(password),
    },
  ];
}

export function getPasswordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  }

  if (!UPPERCASE_PATTERN.test(password)) {
    return 'A senha deve conter pelo menos uma letra maiúscula.';
  }

  if (!NUMBER_PATTERN.test(password)) {
    return 'A senha deve conter pelo menos um número.';
  }

  if (!SPECIAL_PATTERN.test(password)) {
    return 'A senha deve conter pelo menos um caractere especial.';
  }

  return null;
}

export function isPasswordValid(password: string): boolean {
  return getPasswordError(password) === null;
}
