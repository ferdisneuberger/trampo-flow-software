import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RefreshTokenRepository } from '../../../domain/auth/repositories/refresh-token.repository';
import { RefreshTokenGenerator } from '../../../domain/auth/services/refresh-token-generator';
import { RefreshTokenPolicy } from '../../../domain/auth/services/refresh-token-policy';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';

export type RefreshSessionInput = {
  refreshToken: string;
  userAgent?: string | null;
};

export type RefreshedSession = {
  userId: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly refreshTokenPolicy: RefreshTokenPolicy,
  ) {}

  async execute(input: RefreshSessionInput): Promise<RefreshedSession> {
    const record = await this.refreshTokenRepository.findByHash(
      this.refreshTokenGenerator.hash(input.refreshToken),
    );

    if (!record) {
      throw new UnauthorizedError('Sessão inválida.', 'INVALID_REFRESH_TOKEN');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await this.refreshTokenRepository.revoke(record.id, null);

      throw new UnauthorizedError('Sessão expirada.', 'EXPIRED_REFRESH_TOKEN');
    }

    if (record.revokedAt) {
      const revokedFor = Date.now() - record.revokedAt.getTime();
      const wasRotated = record.replacedBy !== null;

      if (!wasRotated || revokedFor > this.refreshTokenPolicy.graceMs) {
        await this.refreshTokenRepository.revokeFamily(record.familyId);

        throw new UnauthorizedError(
          'Sessão reutilizada.',
          'REFRESH_TOKEN_REUSED',
        );
      }
    }

    const { token, hash } = this.refreshTokenGenerator.generate();
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + this.refreshTokenPolicy.ttlMs);

    await this.refreshTokenRepository.create({
      id,
      userId: record.userId,
      tokenHash: hash,
      familyId: record.familyId,
      expiresAt,
      userAgent: input.userAgent ?? null,
    });

    await this.refreshTokenRepository.revoke(record.id, id);

    return {
      userId: record.userId,
      refreshToken: token,
      refreshTokenExpiresAt: expiresAt,
    };
  }
}
