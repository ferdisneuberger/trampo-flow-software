import { Injectable } from '@nestjs/common';
import { ThemePreference } from '../../../domain/users/enums/theme-preference.enum';
import { User } from '../../../domain/users/entities/user.entity';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';

export type UpdateThemePreferenceInput = {
  userId: string;
  themePreference: ThemePreference;
};

@Injectable()
export class UpdateThemePreferenceUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: UpdateThemePreferenceInput): Promise<User> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UnauthorizedError('Token inválido ou expirado.');
    }

    user.changeThemePreference(input.themePreference);

    await this.userRepository.update(user);

    return user;
  }
}
