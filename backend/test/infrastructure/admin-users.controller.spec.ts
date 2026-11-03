import type { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { DeleteUserByEmailUseCase } from '../../src/application/auth/use-cases/delete-user-by-email.use-case';
import { AdminUsersController } from '../../src/infrastructure/http/controllers/admin-users.controller';
import { RateLimiterService } from '../../src/infrastructure/auth/rate-limiter.service';

function createController(apiKey = 'secret-key') {
  const execute = vi.fn().mockResolvedValue(undefined);
  const consume = vi.fn();
  const config = {
    get: (key: string) => (key === 'API_KEY_DELETE' ? apiKey : undefined),
  } as unknown as ConfigService;
  const controller = new AdminUsersController(
    { execute } as unknown as DeleteUserByEmailUseCase,
    { consume } as unknown as RateLimiterService,
    config,
  );

  return { controller, execute, consume };
}

function makeRequest(): FastifyRequest {
  return { ip: '127.0.0.1' } as FastifyRequest;
}

describe('AdminUsersController', () => {
  it('exclui o usuário com a API key correta', async () => {
    const { controller, execute, consume } = createController();

    await controller.deleteUser(
      'pessoa@exemplo.com',
      'secret-key',
      makeRequest(),
    );

    expect(execute).toHaveBeenCalledWith({ email: 'pessoa@exemplo.com' });
    expect(consume).toHaveBeenCalledWith(
      'admin:delete-user:minute:127.0.0.1',
      10,
      60 * 1000,
    );
    expect(consume).toHaveBeenCalledWith(
      'admin:delete-user:hour:127.0.0.1',
      30,
      60 * 60 * 1000,
    );
  });

  it('recusa API key inválida', async () => {
    const { controller, execute } = createController();

    await expect(
      controller.deleteUser('pessoa@exemplo.com', 'errada', makeRequest()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(execute).not.toHaveBeenCalled();
  });

  it('recusa quando a chave não está configurada', async () => {
    const { controller } = createController('');

    await expect(
      controller.deleteUser('pessoa@exemplo.com', 'secret-key', makeRequest()),
    ).rejects.toMatchObject({ status: 403 });
  });
});
