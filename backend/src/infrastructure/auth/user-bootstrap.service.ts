import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../../domain/users/entities/user.entity';
import { UserRepository } from '../../domain/users/repositories/user.repository';
import { PasswordHasher } from '../../domain/users/services/password-hasher';
import { assertPasswordPolicy } from '../../domain/users/services/password-policy';

/**
 * Provisiona o primeiro usuário a partir de `AUTH_USERNAME`/`AUTH_PASSWORD`
 * quando a tabela está vazia. Depois do primeiro boot, as variáveis podem sair
 * do ambiente: a autenticação passa a usar apenas o banco.
 */
@Injectable()
export class UserBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(UserBootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async onModuleInit(): Promise<void> {
    const username = this.configService.get<string>('AUTH_USERNAME')?.trim();
    const password = this.configService.get<string>('AUTH_PASSWORD');

    if (!username || !password) {
      return;
    }

    if (await this.userRepository.existsAny()) {
      return;
    }

    assertPasswordPolicy(password);

    const passwordHash = await this.passwordHasher.hash(password);
    const user = User.create({ username, passwordHash });

    await this.userRepository.create(user);

    this.logger.log(
      `Usuário inicial "${user.username}" criado a partir do ambiente.`,
    );
  }
}
