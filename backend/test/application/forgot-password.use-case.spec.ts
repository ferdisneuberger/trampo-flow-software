import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthSettings } from '../../src/application/auth/services/auth-settings';
import { ForgotPasswordUseCase } from '../../src/application/auth/use-cases/forgot-password.use-case';
import { AuthToken } from '../../src/domain/auth/entities/auth-token.entity';
import type { MailMessage } from '../../src/domain/auth/services/mailer';
import { PasswordResetTokenGenerator } from '../../src/domain/auth/services/password-reset-token-generator';
import { TokenHasher } from '../../src/domain/auth/services/token-hasher';
import { User } from '../../src/domain/users/entities/user.entity';
import { InMemoryAuthTokenRepository } from '../repositories/in-memory-auth-token.repository';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';
const TOKEN = 'reset-token';

function makeSettings(): AuthSettings {
  return new AuthSettings(
    true,
    24 * 60 * 60 * 1000,
    120 * 1000,
    60 * 60 * 1000,
    '2026-11',
    'https://app.exemplo.com',
  );
}

async function setup(options: { noPassword?: boolean } = {}) {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryAuthTokenRepository();
  const user = options.noPassword
    ? User.restore({
        id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
        email: 'pessoa@exemplo.com',
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        verificationSentAt: null,
        termsAcceptedAt: null,
        termsVersion: null,
        username: null,
        passwordHash: null,
        lastLoginAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })
    : User.create({ email: 'pessoa@exemplo.com', passwordHash: PASSWORD_HASH });

  await users.create(user);

  await tokens.create(
    AuthToken.create({
      userId: user.id,
      type: 'PASSWORD_RESET',
      tokenHash: 'old-token',
      expiresAt: new Date(Date.now() + 60_000),
    }),
  );

  const sendMail = vi
    .fn<(message: MailMessage) => Promise<void>>()
    .mockResolvedValue(undefined);
  const generator = {
    generate: vi.fn().mockReturnValue(TOKEN),
  } as unknown as PasswordResetTokenGenerator;
  const hasher = {
    hash: vi.fn((value: string) => `hash:${value}`),
  } as unknown as TokenHasher;

  const useCase = new ForgotPasswordUseCase(
    users,
    tokens,
    generator,
    hasher,
    { send: sendMail },
    makeSettings(),
  );

  return { useCase, users, tokens, user, sendMail };
}

describe('ForgotPasswordUseCase', () => {
  it('cria token, invalida o anterior e envia o link', async () => {
    const context = await setup();

    await context.useCase.execute({ email: ' PESSOA@EXEMPLO.COM ' });

    expect(await context.tokens.findByHash('old-token')).toBeNull();

    const token = await context.tokens.findByHash(`hash:${TOKEN}`);
    expect(token?.type).toBe('PASSWORD_RESET');
    expect(token?.usedAt).toBeNull();

    const message = context.sendMail.mock.calls[0]?.[0];
    expect(message?.to).toBe('pessoa@exemplo.com');
    expect(message?.subject).toContain('Redefinir');
    expect(message?.text).toContain(
      'https://app.exemplo.com/redefinir-senha#token=reset-token',
    );
  });

  it('não envia nada para e-mail inexistente', async () => {
    const context = await setup();

    await context.useCase.execute({ email: 'ninguem@exemplo.com' });

    expect(context.sendMail).not.toHaveBeenCalled();
  });

  it('não envia nada para conta sem senha', async () => {
    const context = await setup({ noPassword: true });

    await context.useCase.execute({ email: 'pessoa@exemplo.com' });

    expect(context.sendMail).not.toHaveBeenCalled();
  });

  it('ignora e-mail inválido sem erro', async () => {
    const context = await setup();

    await expect(
      context.useCase.execute({ email: 'nao-e-email' }),
    ).resolves.toBeUndefined();
    expect(context.sendMail).not.toHaveBeenCalled();
  });

  it('mantém o token quando o envio falha', async () => {
    const context = await setup();
    const logger = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    context.sendMail.mockRejectedValueOnce(new Error('SMTP fora do ar'));

    await context.useCase.execute({ email: 'pessoa@exemplo.com' });

    expect(await context.tokens.findByHash(`hash:${TOKEN}`)).not.toBeNull();
    expect(logger).toHaveBeenCalled();

    logger.mockRestore();
  });
});
