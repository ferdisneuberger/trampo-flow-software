import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL ?? '';
const password = process.env.E2E_PASSWORD ?? '';
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
    email.length === 0 || password.length === 0,
    'E2E_EMAIL e E2E_PASSWORD não definidos.',
  );

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
