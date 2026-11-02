import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RefreshTokenRepository } from '../../../domain/auth/repositories/refresh-token.repository';
import { RefreshTokenGenerator } from '../../../domain/auth/services/refresh-token-generator';
import { RefreshTokenPolicy } from '../../../domain/auth/services/refresh-token-policy';

export type CreateSessionInput = {
  userId: string;
  userAgent?: string | null;
};

export type SessionTokens = {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class CreateSessionUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly refreshTokenPolicy: RefreshTokenPolicy,
  ) {}

  async execute(input: CreateSessionInput): Promise<SessionTokens> {
    const { token, hash } = this.refreshTokenGenerator.generate();
    const expiresAt = new Date(Date.now() + this.refreshTokenPolicy.ttlMs);

    await this.refreshTokenRepository.deleteExpired(new Date());

    await this.refreshTokenRepository.create({
      id: randomUUID(),
      userId: input.userId,
      tokenHash: hash,
      familyId: randomUUID(),
      expiresAt,
      userAgent: input.userAgent ?? null,
    });

    return { refreshToken: token, refreshTokenExpiresAt: expiresAt };
  }
}
