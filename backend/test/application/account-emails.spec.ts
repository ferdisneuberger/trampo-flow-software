import { describe, expect, it } from 'vitest';
import { buildVerificationEmail } from '../../src/application/auth/emails/verification-email';
import { buildPasswordResetEmail } from '../../src/application/auth/emails/password-reset-email';
import { buildVerifiedEmail } from '../../src/application/auth/emails/verified-email';

describe('verification email', () => {
  const email = buildVerificationEmail({
    code: 'ADK-7YP',
    appBaseUrl: 'https://app.exemplo.com/',
    expiresInHours: 24,
  });

  it('destaca o código no texto e no HTML', () => {
    expect(email.subject).toContain('verificação');
    expect(email.text).toContain('ADK-7YP');
    expect(email.html).toContain('ADK-7YP');
    expect(email.text).toContain('24 horas');
  });

  it('inclui o link com o código no fragmento', () => {
    expect(email.text).toContain(
      'https://app.exemplo.com/verificar-email#token=ADK-7YP',
    );
    expect(email.html).toContain(
      'https://app.exemplo.com/verificar-email#token=ADK-7YP',
    );
  });
});

describe('verified email', () => {
  const email = buildVerifiedEmail({
    appBaseUrl: 'https://app.exemplo.com/',
  });

  it('confirma a verificação e aponta para o quadro', () => {
    expect(email.subject).toContain('verificado');
    expect(email.text).toContain('verificado com sucesso');
    expect(email.text).toContain('https://app.exemplo.com/candidaturas');
    expect(email.html).toContain('Ir para o quadro');
  });
});

describe('password reset email', () => {
  const email = buildPasswordResetEmail({
    token: 'reset-token',
    appBaseUrl: 'https://app.exemplo.com/',
    expiresInMinutes: 60,
  });

  it('destaca o link de redefinição e a validade', () => {
    expect(email.subject).toContain('Redefinir');
    expect(email.text).toContain(
      'https://app.exemplo.com/redefinir-senha#token=reset-token',
    );
    expect(email.html).toContain('Criar nova senha');
    expect(email.text).toContain('60 minutos');
  });
});
