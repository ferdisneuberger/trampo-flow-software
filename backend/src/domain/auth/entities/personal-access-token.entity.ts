import { randomUUID } from 'node:crypto';
import { DomainError } from '../../shared/errors/domain.error';
import {
  PERSONAL_ACCESS_TOKEN_SCOPES,
  parseScope,
  READ_WRITE_SCOPE,
} from '../scopes';

export const PERSONAL_ACCESS_TOKEN_NAME_MAX_LENGTH = 60;

type PersonalAccessTokenProps = {
  userId: string;
  name: string;
  tokenHash: string;
  prefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  scope: string;
  createdAt: Date;
};

export type CreatePersonalAccessTokenProps = {
  userId: string;
  name: string;
  tokenHash: string;
  prefix: string;
  expiresAt: Date;
  /** Padrão: leitura e escrita. */
  scope?: string;
};

export type RestorePersonalAccessTokenProps = PersonalAccessTokenProps & {
  id: string;
};

export class PersonalAccessToken {
  private constructor(
    private readonly _id: string,
    private props: PersonalAccessTokenProps,
  ) {}

  static create(input: CreatePersonalAccessTokenProps): PersonalAccessToken {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new DomainError(
        'O nome do token é obrigatório.',
        'INVALID_TOKEN_NAME',
      );
    }

    if (name.length > PERSONAL_ACCESS_TOKEN_NAME_MAX_LENGTH) {
      throw new DomainError(
        `O nome do token deve ter no máximo ${PERSONAL_ACCESS_TOKEN_NAME_MAX_LENGTH} caracteres.`,
        'INVALID_TOKEN_NAME',
      );
    }

    const scope = input.scope ?? READ_WRITE_SCOPE;

    if (!(PERSONAL_ACCESS_TOKEN_SCOPES as readonly string[]).includes(scope)) {
      throw new DomainError(
        'Permissão do token inválida.',
        'INVALID_TOKEN_SCOPE',
      );
    }

    if (input.tokenHash.length === 0) {
      throw new DomainError(
        'O hash do token é obrigatório.',
        'INVALID_TOKEN_HASH',
      );
    }

    return new PersonalAccessToken(randomUUID(), {
      userId: input.userId,
      name,
      tokenHash: input.tokenHash,
      prefix: input.prefix,
      lastUsedAt: null,
      expiresAt: new Date(input.expiresAt),
      revokedAt: null,
      scope,
      createdAt: new Date(),
    });
  }

  static restore(input: RestorePersonalAccessTokenProps): PersonalAccessToken {
    return new PersonalAccessToken(input.id, {
      userId: input.userId,
      name: input.name,
      tokenHash: input.tokenHash,
      prefix: input.prefix,
      lastUsedAt: input.lastUsedAt ? new Date(input.lastUsedAt) : null,
      expiresAt: new Date(input.expiresAt),
      revokedAt: input.revokedAt ? new Date(input.revokedAt) : null,
      scope: input.scope,
      createdAt: new Date(input.createdAt),
    });
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get prefix(): string {
    return this.props.prefix;
  }

  get lastUsedAt(): Date | null {
    return this.props.lastUsedAt ? new Date(this.props.lastUsedAt) : null;
  }

  get expiresAt(): Date {
    return new Date(this.props.expiresAt);
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt ? new Date(this.props.revokedAt) : null;
  }

  get scope(): string {
    return this.props.scope;
  }

  get scopes(): string[] {
    return parseScope(this.props.scope);
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  isExpired(at: Date): boolean {
    return this.props.expiresAt.getTime() <= at.getTime();
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isActive(at: Date): boolean {
    return !this.isRevoked() && !this.isExpired(at);
  }
}
