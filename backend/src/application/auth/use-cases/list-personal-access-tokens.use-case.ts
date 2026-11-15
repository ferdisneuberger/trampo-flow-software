import { Injectable } from '@nestjs/common';
import { PersonalAccessToken } from '../../../domain/auth/entities/personal-access-token.entity';
import { PersonalAccessTokenRepository } from '../../../domain/auth/repositories/personal-access-token.repository';

@Injectable()
export class ListPersonalAccessTokensUseCase {
  constructor(private readonly repository: PersonalAccessTokenRepository) {}

  execute(userId: string): Promise<PersonalAccessToken[]> {
    return this.repository.listByUser(userId);
  }
}
