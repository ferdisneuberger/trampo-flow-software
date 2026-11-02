import { Injectable } from '@nestjs/common';
import { RefreshTokenRepository } from '../../../domain/auth/repositories/refresh-token.repository';
import { RefreshTokenGenerator } from '../../../domain/auth/services/refresh-token-generator';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
  ) {}

  async execute(refreshToken: string | null | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const record = await this.refreshTokenRepository.findByHash(
      this.refreshTokenGenerator.hash(refreshToken),
    );

    if (!record) {
      return;
    }

    await this.refreshTokenRepository.revokeFamily(record.familyId);
  }
}
