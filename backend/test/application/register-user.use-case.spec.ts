import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RegisterUserUseCase } from '../../src/application/auth/use-cases/register-user.use-case';
import { AuthSettings } from '../../src/application/auth/services/auth-settings';
import { ConflictError } from '../../src/application/shared/errors/conflict.error';
import { ForbiddenError } from '../../src/application/shared/errors/forbidden.error';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import {
  Mailer,
  type MailMessage,
} from '../../src/domain/auth/services/mailer';
import { TokenHasher } from '../../src/domain/auth/services/token-hasher';
import { VerificationCodeGenerator } from '../../src/domain/auth/services/verification-code-generator';
import { User } from '../../src/domain/users/entities/user.entity';
import { PasswordHasher } from '../../src/domain/users/services/password-hasher';
import { InMemoryAuthTokenRepository } from '../repositories/in-memory-auth-token.repository';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const EMAIL = 'pessoa@exemplo.com';
const CODE = 'ADK-7YP';
const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function makeSettings(overrides: Partial<AuthSettings> = {}): AuthSettings {
  return new AuthSettings(
    overrides.registrationEnabled ?? true,
    overrides.verificationTtlMs ?? 24 * 60 * 60 * 1000,
    overrides.resendCooldownMs ?? 120 * 1000,
    overrides.passwordResetTtlMs ?? 15 * 60 * 1000,
    overrides.termsVersion ?? '2026-11',
    overrides.appBaseUrl ?? 'https://app.exemplo.com',
  );
}

function setup(settings = makeSettings()) {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryAuthTokenRepository();
  const passwordHasher = {
    hash: vi.fn().mockResolvedValue(PASSWORD_HASH),
    verify: vi.fn(),
  } as unknown as PasswordHasher;
  const codeGenerator = {
    generate: vi.fn().mockReturnValue(CODE),
  } as unknown as VerificationCodeGenerator;
  const tokenHasher = {
    hash: vi.fn((value: string) => `hash:${value}`),
  } as unknown as TokenHasher;
  const sendMail = vi
    .fn<(message: MailMessage) => Promise<void>>()
    .mockResolvedValue(undefined);
  const mailer = {
    send: sendMail,
  } as unknown as Mailer;

  const useCase = new RegisterUserUseCase(
    users,
    tokens,
    passwordHasher,
    codeGenerator,
    tokenHasher,
    mailer,
    settings,
  );

  return {
    useCase,
    users,
    tokens,
    passwordHasher,
    codeGenerator,
    tokenHasher,
    sendMail,
  };
}

describe('RegisterUserUseCase', () => {
  it('cria usuário não verificado e envia o código', async () => {
    const { useCase, users, tokens, sendMail } = setup();

    await useCase.execute({
      email: '  PESSOA@EXEMPLO.COM  ',
      firstName: '  Fernando  ',
      lastName: '  Neuberger  ',
      password: 'Senha-super-secreta1!',
      termsAccepted: true,
    });

    const user = await users.findByEmail(EMAIL);

    expect(user).not.toBeNull();
    expect(user?.firstName).toBe('Fernando');
    expect(user?.lastName).toBe('Neuberger');
    expect(user?.isEmailVerified).toBe(false);
    expect(user?.termsVersion).toBe('2026-11');
    expect(user?.termsAcceptedAt).toBeInstanceOf(Date);
    expect(user?.verificationSentAt).toBeInstanceOf(Date);

    const token = await tokens.findByHash(`hash:${CODE}`);
    expect(token?.type).toBe('EMAIL_VERIFICATION');
    expect(token?.usedAt).toBeNull();

    const message = sendMail.mock.calls[0]?.[0];

    expect(message?.to).toBe(EMAIL);
    expect(message?.subject).toContain('verificação');
    expect(message?.text).toContain(CODE);
  });

  it('recusa e-mail já cadastrado', async () => {
    const { useCase, users } = setup();

    await users.create(
      User.create({ email: EMAIL, passwordHash: PASSWORD_HASH }),
    );

    await expect(
      useCase.execute({
        email: EMAIL,
        firstName: 'Fernando',
        lastName: 'Neuberger',
        password: 'Senha-super-secreta1!',
        termsAccepted: true,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('recusa cadastro desabilitado', async () => {
    const { useCase } = setup(makeSettings({ registrationEnabled: false }));

    await expect(
      useCase.execute({
        email: EMAIL,
        firstName: 'Fernando',
        lastName: 'Neuberger',
        password: 'Senha-super-secreta1!',
        termsAccepted: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('recusa termos não aceitos', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        email: EMAIL,
        firstName: 'Fernando',
        lastName: 'Neuberger',
        password: 'Senha-super-secreta1!',
        termsAccepted: false,
      }),
    ).rejects.toMatchObject({
      code: 'TERMS_NOT_ACCEPTED',
    });
  });

  it('recusa senha fora da política', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        email: EMAIL,
        firstName: 'Fernando',
        lastName: 'Neuberger',
        password: 'curta',
        termsAccepted: true,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('mantém o cadastro mesmo quando o envio falha', async () => {
    const { useCase, users, sendMail } = setup();
    const logger = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    sendMail.mockRejectedValueOnce(new Error('SMTP fora do ar'));

    await useCase.execute({
      email: EMAIL,
      firstName: 'Fernando',
      lastName: 'Neuberger',
      password: 'Senha-super-secreta1!',
      termsAccepted: true,
    });

    expect(await users.findByEmail(EMAIL)).not.toBeNull();
    expect(logger).toHaveBeenCalled();

    logger.mockRestore();
  });
});
