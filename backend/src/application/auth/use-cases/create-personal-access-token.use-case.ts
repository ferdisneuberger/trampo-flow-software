import { Injectable } from '@nestjs/common';
import { PersonalAccessToken } from '../../../domain/auth/entities/personal-access-token.entity';
import { PersonalAccessTokenRepository } from '../../../domain/auth/repositories/personal-access-token.repository';
import { PersonalAccessTokenGenerator } from '../../../domain/auth/services/personal-access-token-generator';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { DomainError } from '../../../domain/shared/errors/domain.error';

export const PERSONAL_ACCESS_TOKEN_DEFAULT_DAYS = 90;
export const PERSONAL_ACCESS_TOKEN_MAX_DAYS = 365;
export const PERSONAL_ACCESS_TOKEN_MAX_ACTIVE = 20;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type CreatePersonalAccessTokenInput = {
  userId: string;
  name: string;
  expiresInDays?: number;
};

export type CreatePersonalAccessTokenOutput = {
  token: PersonalAccessToken;
  /** Segredo em texto puro: só existe nesta resposta. */
  secret: string;
};

@Injectable()
export class CreatePersonalAccessTokenUseCase {
  constructor(
    private readonly repository: PersonalAccessTokenRepository,
    private readonly generator: PersonalAccessTokenGenerator,
    private readonly hasher: TokenHasher,
  ) {}

  async execute(
    input: CreatePersonalAccessTokenInput,
  ): Promise<CreatePersonalAccessTokenOutput> {
    const days = input.expiresInDays ?? PERSONAL_ACCESS_TOKEN_DEFAULT_DAYS;

    if (
      !Number.isInteger(days) ||
      days < 1 ||
      days > PERSONAL_ACCESS_TOKEN_MAX_DAYS
    ) {
      throw new DomainError(
        `A validade deve ficar entre 1 e ${PERSONAL_ACCESS_TOKEN_MAX_DAYS} dias.`,
        'INVALID_TOKEN_EXPIRATION',
      );
    }

    const now = new Date();
    const existing = await this.repository.listByUser(input.userId);
    const active = existing.filter((token) => token.isActive(now)).length;

    if (active >= PERSONAL_ACCESS_TOKEN_MAX_ACTIVE) {
      throw new DomainError(
        `Limite de ${PERSONAL_ACCESS_TOKEN_MAX_ACTIVE} tokens ativos atingido. Revogue um token antes de criar outro.`,
        'TOKEN_LIMIT_REACHED',
      );
    }

    const { token: secret, prefix } = this.generator.generate();
    const token = PersonalAccessToken.create({
      userId: input.userId,
      name: input.name,
      tokenHash: this.hasher.hash(secret),
      prefix,
      expiresAt: new Date(now.getTime() + days * DAY_IN_MS),
    });

    await this.repository.create(token);

    return { token, secret };
  }
}
