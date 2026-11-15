import { Injectable } from '@nestjs/common';
import { PersonalAccessTokenRepository } from '../../../domain/auth/repositories/personal-access-token.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';

export type RevokePersonalAccessTokenInput = {
  userId: string;
  id: string;
};

@Injectable()
export class RevokePersonalAccessTokenUseCase {
  constructor(private readonly repository: PersonalAccessTokenRepository) {}

  async execute(input: RevokePersonalAccessTokenInput): Promise<void> {
    const token = await this.repository.findById(input.id, input.userId);

    if (!token) {
      throw new NotFoundError('Token não encontrado.', 'TOKEN_NOT_FOUND');
    }

    if (token.isRevoked()) {
      return;
    }

    await this.repository.revoke(token.id, new Date());
  }
}
