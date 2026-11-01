import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/users/entities/user.entity';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';

@Injectable()
export class GetUserProfileUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('Token inválido ou expirado.');
    }

    return user;
  }
}
