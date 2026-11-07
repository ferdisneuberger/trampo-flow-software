import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const baseUrl = process.env.E2E_BASE_URL ?? '';
const email = process.env.E2E_EMAIL ?? '';
const password = process.env.E2E_PASSWORD ?? '';
const mailpitUrl = process.env.E2E_MAILPIT_URL ?? '';
const title = `E2E ${Date.now()}`;

// Sem E2E_BASE_URL explícito nada roda: isso evita apontar sem querer para o
// stack de desenvolvimento, que usa o SMTP real e o banco de verdade. O CI e o
// `npm run test:e2e:local` definem a variável para um stack com Mailpit.
test.skip(
  baseUrl.length === 0,
  'E2E_BASE_URL não definido. Use `npm run test:e2e:local`.',
);

test('login não tem violações WCAG A/AA', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test.describe('fluxo crítico do quadro', () => {
  // O usuário é criado já verificado por `backend/scripts/create-e2e-user.mjs`,
  // então este fluxo não depende de e-mail.
  test.skip(
    email.length === 0 || password.length === 0,
    'E2E_EMAIL e E2E_PASSWORD não definidos.',
  );

  test('login, criação, busca, detalhe e exclusão', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/candidaturas$/);
    await expect(
      page.getByRole('button', { name: /Menu da conta/ }),
    ).toBeVisible();

    // A sessão volta pelo cookie de refresh depois de recarregar.
    await page.reload();
    await expect(page).toHaveURL(/\/candidaturas$/);
    await expect(
      page.getByRole('button', { name: /Menu da conta/ }),
    ).toBeVisible();

    await page.goto('/');
    await expect(page).toHaveURL(/\/candidaturas$/);

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

  test('encerra a sessão pelo menu da conta', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/candidaturas$/);

    await page.getByRole('button', { name: /Menu da conta/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Sair' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Sair' }).click();

    await expect(page).toHaveURL(/\/login$/);
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

// Único teste que depende de e-mail: valida o contrato entre o e-mail enviado,
// o código e a página de verificação.
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
