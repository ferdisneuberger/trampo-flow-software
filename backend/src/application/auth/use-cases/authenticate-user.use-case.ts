import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { User } from '../../../domain/users/entities/user.entity';
import { USERNAME_MAX_LENGTH } from '../../../domain/users/entities/user.entity';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { PasswordHasher } from '../../../domain/users/services/password-hasher';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';

export type AuthenticateUserInput = {
  username: string;
  password: string;
};

@Injectable()
export class AuthenticateUserUseCase {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute({ username, password }: AuthenticateUserInput): Promise<User> {
    const candidate = username.trim().toLowerCase();
    const user =
      candidate.length > 0 && candidate.length <= USERNAME_MAX_LENGTH
        ? await this.userRepository.findByUsername(candidate)
        : null;

    if (!user) {
      await this.verifyDummyPassword(password);

      throw new UnauthorizedError();
    }

    const matches = await this.passwordHasher.verify(
      password,
      user.passwordHash,
    );

    if (!matches) {
      throw new UnauthorizedError();
    }

    user.registerLogin(new Date());
    await this.userRepository.update(user);

    return user;
  }

  /**
   * Gasta o mesmo tempo do caminho feliz quando o usuário não existe, para não
   * revelar por tempo de resposta quais usernames estão cadastrados.
   */
  private async verifyDummyPassword(password: string): Promise<void> {
    this.dummyHash ??= this.passwordHasher.hash(
      randomBytes(32).toString('hex'),
    );

    await this.passwordHasher.verify(password, await this.dummyHash);
  }
}
