import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { normalizeEmail } from '../../../domain/users/entities/user.entity';
import { UserRepository } from '../../../domain/users/repositories/user.repository';

export type DeleteUserByEmailInput = {
  email: string;
};

@Injectable()
export class DeleteUserByEmailUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute({ email }: DeleteUserByEmailInput): Promise<void> {
    const normalized = normalizeEmail(email);
    const user = await this.userRepository.findByEmail(normalized);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado.', 'USER_NOT_FOUND');
    }

    await this.userRepository.delete(user.id);
  }
}
