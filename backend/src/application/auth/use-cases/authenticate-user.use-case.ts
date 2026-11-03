import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  normalizeEmail,
  type User,
} from '../../../domain/users/entities/user.entity';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { PasswordHasher } from '../../../domain/users/services/password-hasher';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';

export type AuthenticateUserInput = {
  email: string;
  password: string;
};

@Injectable()
export class AuthenticateUserUseCase {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute({ email, password }: AuthenticateUserInput): Promise<User> {
    const candidate = this.tryNormalizeEmail(email);
    const user = candidate
      ? await this.userRepository.findByEmail(candidate)
      : null;

    if (!user || !user.passwordHash) {
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

  private tryNormalizeEmail(value: string): string | null {
    try {
      return normalizeEmail(value);
    } catch {
      return null;
    }
  }

  private async verifyDummyPassword(password: string): Promise<void> {
    this.dummyHash ??= this.passwordHasher.hash(
      randomBytes(32).toString('hex'),
    );

    await this.passwordHasher.verify(password, await this.dummyHash);
  }
}
