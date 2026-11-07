import { describe, expect, it } from 'vitest';
import { buildVerificationEmail } from '../../src/application/auth/emails/verification-email';
import { buildPasswordResetEmail } from '../../src/application/auth/emails/password-reset-email';
import { buildVerifiedEmail } from '../../src/application/auth/emails/verified-email';
import { renderButton } from '../../src/application/auth/emails/email-layout';

describe('verification email', () => {
  const email = buildVerificationEmail({
    code: 'ADK-7YP',
    appBaseUrl: 'https://app.exemplo.com/',
    expiresInHours: 12,
  });

  it('destaca o código no texto e no HTML', () => {
    expect(email.subject).toContain('verificação');
    expect(email.text).toContain('ADK-7YP');
    expect(email.html).toContain('ADK-7YP');
    expect(email.text).toContain('12 horas');
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
    expiresInMinutes: 15,
  });

  it('destaca o link de redefinição e a validade', () => {
    expect(email.subject).toContain('Redefinir');
    expect(email.text).toContain(
      'https://app.exemplo.com/redefinir-senha#token=reset-token',
    );
    expect(email.html).toContain('Criar nova senha');
    expect(email.text).toContain('15 minutos');
  });
});

describe('identidade dos e-mails transacionais', () => {
  const email = buildVerificationEmail({
    code: 'ADK-7YP',
    appBaseUrl: 'https://app.exemplo.com/',
    expiresInHours: 12,
  });

  it('usa a paleta e o wordmark da v3', () => {
    expect(email.html).toContain('#f2e8d5');
    expect(email.html).toContain('#f7c948');
    expect(email.html).toContain('#ff5a3c');
    expect(email.html).toContain('trampo');
    expect(email.html).toContain('flow');
    expect(email.html).not.toContain('#274dc4');
  });

  it('inclui modo escuro e metadados de cliente de e-mail', () => {
    expect(email.html).toContain('prefers-color-scheme: dark');
    expect(email.html).toContain('data-ogsc');
    expect(email.html).toContain('color-scheme');
    expect(email.html).toContain('name="viewport"');
  });

  it('mantém uma versão texto pura completa', () => {
    expect(email.text).toContain('confirmar seu e-mail');
    expect(email.text).toContain('ADK-7YP');
    expect(email.text).toContain('12 horas');
  });

  it('escapa rótulo e href do botão', () => {
    const button = renderButton('<Voltar>', 'https://x.test/?a=1&b=2');

    expect(button).toContain('&lt;Voltar&gt;');
    expect(button).toContain('a=1&amp;b=2');
  });
});
