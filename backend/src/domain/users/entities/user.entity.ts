import { randomUUID } from 'node:crypto';
import { DomainError } from '../../shared/errors/domain.error';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 120;
export const PASSWORD_HASH_MAX_LENGTH = 255;

const USERNAME_PATTERN = /^[a-z0-9._-]+$/;
const PASSWORD_HASH_PREFIX = 'scrypt$';

type UserProps = {
  username: string;
  passwordHash: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserProps = {
  username: string;
  passwordHash: string;
};

export type RestoreUserProps = UserProps & {
  id: string;
};

/**
 * Normaliza o username antes de qualquer leitura ou escrita. O índice
 * `lower(username)` do banco existe como segunda barreira, mas a regra vive
 * aqui para valer também em memória.
 */
export function normalizeUsername(value: string): string {
  const username = value.trim().toLowerCase();

  if (username.length < USERNAME_MIN_LENGTH) {
    throw new DomainError(
      `O usuário deve ter pelo menos ${USERNAME_MIN_LENGTH} caracteres.`,
      'USERNAME_TOO_SHORT',
    );
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    throw new DomainError(
      `O usuário deve ter no máximo ${USERNAME_MAX_LENGTH} caracteres.`,
      'USERNAME_TOO_LONG',
    );
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new DomainError(
      'O usuário aceita apenas letras, números, ponto, hífen e underline.',
      'USERNAME_INVALID',
    );
  }

  return username;
}

function assertPasswordHash(passwordHash: string): void {
  if (!passwordHash.startsWith(PASSWORD_HASH_PREFIX)) {
    throw new DomainError(
      'O hash de senha precisa estar no formato scrypt.',
      'INVALID_PASSWORD_HASH',
    );
  }

  if (passwordHash.length > PASSWORD_HASH_MAX_LENGTH) {
    throw new DomainError(
      `O hash de senha deve ter no máximo ${PASSWORD_HASH_MAX_LENGTH} caracteres.`,
      'PASSWORD_HASH_TOO_LONG',
    );
  }
}

export class User {
  private constructor(
    private readonly _id: string,
    private props: UserProps,
  ) {}

  static create(input: CreateUserProps): User {
    assertPasswordHash(input.passwordHash);

    const now = new Date();

    return new User(randomUUID(), {
      username: normalizeUsername(input.username),
      passwordHash: input.passwordHash,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(input: RestoreUserProps): User {
    return new User(input.id, {
      username: normalizeUsername(input.username),
      passwordHash: input.passwordHash,
      lastLoginAt: input.lastLoginAt ? new Date(input.lastLoginAt) : null,
      createdAt: new Date(input.createdAt),
      updatedAt: new Date(input.updatedAt),
    });
  }

  get id(): string {
    return this._id;
  }

  get username(): string {
    return this.props.username;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt ? new Date(this.props.lastLoginAt) : null;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  registerLogin(at: Date): void {
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
      throw new DomainError(
        'A data de login precisa ser válida.',
        'INVALID_LOGIN_DATE',
      );
    }

    this.props.lastLoginAt = new Date(at);
    this.props.updatedAt = new Date(at);
  }
}
