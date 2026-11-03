import { randomUUID } from 'node:crypto';
import { DomainError } from '../../shared/errors/domain.error';
import type { AuthTokenType } from '../enums/auth-token-type.enum';

type AuthTokenProps = {
  userId: string;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type CreateAuthTokenProps = {
  userId: string;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
};

export type RestoreAuthTokenProps = AuthTokenProps & {
  id: string;
};

export class AuthToken {
  private constructor(
    private readonly _id: string,
    private props: AuthTokenProps,
  ) {}

  static create(input: CreateAuthTokenProps): AuthToken {
    if (input.tokenHash.length === 0) {
      throw new DomainError(
        'O hash do token é obrigatório.',
        'INVALID_TOKEN_HASH',
      );
    }

    const now = new Date();

    return new AuthToken(randomUUID(), {
      userId: input.userId,
      type: input.type,
      tokenHash: input.tokenHash,
      expiresAt: new Date(input.expiresAt),
      usedAt: null,
      createdAt: now,
    });
  }

  static restore(input: RestoreAuthTokenProps): AuthToken {
    return new AuthToken(input.id, {
      userId: input.userId,
      type: input.type,
      tokenHash: input.tokenHash,
      expiresAt: new Date(input.expiresAt),
      usedAt: input.usedAt ? new Date(input.usedAt) : null,
      createdAt: new Date(input.createdAt),
    });
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): AuthTokenType {
    return this.props.type;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get expiresAt(): Date {
    return new Date(this.props.expiresAt);
  }

  get usedAt(): Date | null {
    return this.props.usedAt ? new Date(this.props.usedAt) : null;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  isExpired(at: Date): boolean {
    return this.props.expiresAt.getTime() <= at.getTime();
  }

  isUsed(): boolean {
    return this.props.usedAt !== null;
  }
}
