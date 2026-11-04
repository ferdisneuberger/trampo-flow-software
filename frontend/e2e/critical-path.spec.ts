import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL ?? '';
const password = process.env.E2E_PASSWORD ?? '';
const mailpitUrl = process.env.E2E_MAILPIT_URL ?? '';
const title = `E2E ${Date.now()}`;

test('login não tem violações WCAG A/AA', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test.describe('fluxo crítico do quadro', () => {
  test.skip(
    email.length === 0 || password.length === 0 || mailpitUrl.length === 0,
    'E2E_EMAIL, E2E_PASSWORD e E2E_MAILPIT_URL não definidos.',
  );

  test.beforeAll(async ({ request }) => {
    const registration = await request.post('/api/auth/register', {
      data: {
        email,
        firstName: 'Fernando',
        lastName: 'Neuberger',
        password,
        termsAccepted: true,
      },
    });

    if (registration.status() !== 201) {
      expect(registration.status()).toBe(409);
      return;
    }

    const code = await waitForVerificationCode(email);
    const confirmation = await request.post('/api/auth/verification/confirm', {
      data: { token: code },
    });

    expect(confirmation.status()).toBe(204);
  });

  test('login, criação, busca, detalhe e exclusão', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/candidaturas$/);
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/candidaturas$/);
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();

    await page.getByRole('button', { name: /nova candidatura/i }).click();

    await page.getByLabel('Título da candidatura').fill(title);
    await page.getByLabel('Empresa', { exact: true }).fill('Acme E2E');
    await page.getByLabel('Link da vaga').fill('https://example.com/e2e');
    await page.getByLabel('Fase atual').fill('Triagem automatizada');
    await page.getByRole('button', { name: /criar candidatura/i }).click();

    await expect(
      page.getByText('Candidatura criada com sucesso.'),
    ).toBeVisible();

    await page.getByLabel('Buscar').fill(title);

    const card = page.getByRole('link', { name: title });
    await expect(card).toBeVisible();

    await card.click();

    await expect(page).toHaveURL(/\/candidaturas\/[0-9a-f-]+$/);
    await expect(page.getByText('Acme E2E')).toBeVisible();
    await expect(page.getByText('Triagem automatizada')).toBeVisible();

    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    await page
      .getByRole('checkbox', { name: /excluir permanentemente/i })
      .check();
    await page.getByRole('checkbox', { name: /confirmo a exclusão/i }).check();
    await page
      .getByRole('button', { name: /excluir permanentemente/i })
      .click();

    await expect(page).toHaveURL(/\/candidaturas$/);

    await page.getByLabel('Buscar').fill(title);
    await expect(page.getByRole('link', { name: title })).toHaveCount(0);
  });

  test('a rota inicial redireciona para o quadro', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/candidaturas$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/candidaturas$/);
  });
});

async function waitForVerificationCode(targetEmail: string): Promise<string> {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages`);

    if (response.ok) {
      const data = (await response.json()) as {
        messages?: Array<{ ID: string; To?: Array<{ Address: string }> }>;
      };
      const message = data.messages?.find((candidate) =>
        candidate.To?.some((recipient) => recipient.Address === targetEmail),
      );

      if (message) {
        const detail = await fetch(
          `${mailpitUrl}/api/v1/message/${message.ID}`,
        );

        if (detail.ok) {
          const content = (await detail.json()) as { Text?: string };
          const match = content.Text?.match(/\b[A-Z2-9]{3}-[A-Z2-9]{3}\b/);

          if (match) {
            return match[0];
          }
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('O código de verificação não chegou ao Mailpit.');
}

test('cadastro público com verificação de e-mail', async ({ page }) => {
  test.skip(mailpitUrl.length === 0, 'E2E_MAILPIT_URL não definido.');

  const registrationEmail = `e2e-${Date.now()}@example.com`;
  const registrationPassword = 'E2e-register-secret-123';

  await page.goto('/cadastro');
  await page.getByLabel('Nome', { exact: true }).fill('Fernando');
  await page.getByLabel('Último nome').fill('Neuberger');
  await page.getByLabel('E-mail').fill(registrationEmail);
  await page.getByLabel('Senha', { exact: true }).fill(registrationPassword);
  await page.getByLabel('Confirmar senha').fill(registrationPassword);
  await page.getByRole('checkbox', { name: /termos de uso/ }).check();
  await page.getByRole('button', { name: /Criar conta/ }).click();

  await expect(page.getByText('Cadastro recebido')).toBeVisible();

  await page.goto('/login');
  await page.getByLabel('E-mail').fill(registrationEmail);
  await page.getByLabel('Senha').fill(registrationPassword);
  await page.getByRole('button', { name: /entrar/i }).click();

  await expect(page).toHaveURL(/\/verificar-email$/);
  await expect(page.getByText(registrationEmail)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Reenviar em/ }),
  ).toBeDisabled();

  const code = await waitForVerificationCode(registrationEmail);

  await page.goto(`/verificar-email#token=${code}`);
  await expect(page.getByLabel('Código de verificação')).toHaveValue(code);
  await page.getByRole('button', { name: /Confirmar e-mail/ }).click();

  await expect(page.getByText('E-mail confirmado')).toBeVisible();
  await page.getByRole('link', { name: 'Ir para o quadro' }).click();

  await expect(page).toHaveURL(/\/candidaturas$/);
  await expect(
    page.getByRole('button', { name: /Nova candidatura/ }),
  ).toBeEnabled();
});

async function waitForPasswordResetToken(targetEmail: string): Promise<string> {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages`);

    if (response.ok) {
      const data = (await response.json()) as {
        messages?: Array<{ ID: string; To?: Array<{ Address: string }> }>;
      };
      const messages = (data.messages ?? []).filter((candidate) =>
        candidate.To?.some((recipient) => recipient.Address === targetEmail),
      );

      for (const message of messages) {
        const detail = await fetch(
          `${mailpitUrl}/api/v1/message/${message.ID}`,
        );

        if (detail.ok) {
          const content = (await detail.json()) as { Text?: string };
          const match = content.Text?.match(/#token=([A-Za-z0-9_-]{20,})/);

          if (match) {
            return match[1];
          }
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('O link de recuperação não chegou ao Mailpit.');
}

test('recuperação de senha com link por e-mail', async ({ page, request }) => {
  test.skip(mailpitUrl.length === 0, 'E2E_MAILPIT_URL não definido.');

  const resetEmail = `e2e-reset-${Date.now()}@example.com`;
  const initialPassword = 'E2e-reset-secret-123';
  const newPassword = 'E2e-reset-secret-456';

  const register = await request.post('/api/auth/register', {
    data: {
      email: resetEmail,
      firstName: 'Fernando',
      lastName: 'Neuberger',
      password: initialPassword,
      termsAccepted: true,
    },
  });
  expect(register.status()).toBe(201);

  const code = await waitForVerificationCode(resetEmail);
  const confirm = await request.post('/api/auth/verification/confirm', {
    data: { token: code },
  });
  expect(confirm.status()).toBe(204);

  await page.goto('/esqueci-senha');
  await page.getByLabel('E-mail').fill(resetEmail);
  await page.getByRole('button', { name: /Enviar link/ }).click();
  await expect(page.getByText('Verifique seu e-mail')).toBeVisible();

  const resetToken = await waitForPasswordResetToken(resetEmail);

  await page.goto(`/redefinir-senha#token=${resetToken}`);
  await page.getByLabel('Nova senha', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirmar nova senha').fill(newPassword);
  await page.getByRole('button', { name: /Redefinir senha/ }).click();

  await expect(page.getByText('Senha redefinida')).toBeVisible();

  const oldPasswordLogin = await request.post('/api/auth/login', {
    data: { email: resetEmail, password: initialPassword },
  });
  expect(oldPasswordLogin.status()).toBe(401);

  await page.goto('/login');
  await page.getByLabel('E-mail').fill(resetEmail);
  await page.getByLabel('Senha').fill(newPassword);
  await page.getByRole('button', { name: /entrar/i }).click();

  await expect(page).toHaveURL(/\/candidaturas$/);
});
