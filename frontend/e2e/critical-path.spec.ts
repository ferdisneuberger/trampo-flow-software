import { expect, test } from '@playwright/test';

const username = process.env.E2E_USERNAME ?? '';
const password = process.env.E2E_PASSWORD ?? '';
const title = `E2E ${Date.now()}`;

test.describe('fluxo crítico', () => {
  test.skip(
    username.length === 0 || password.length === 0,
    'E2E_USERNAME e E2E_PASSWORD não definidos.',
  );

  test('login, criação, busca, detalhe e exclusão', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Usuário').fill(username);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('link', { name: 'Candidaturas' }).click();
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

    const row = page.getByRole('link', { name: title });
    await expect(row).toBeVisible();

    await row.click();

    await expect(page).toHaveURL(/\/candidaturas\/[0-9a-f-]+$/);
    await expect(page.getByText('Acme E2E')).toBeVisible();
    await expect(page.getByText('Triagem automatizada')).toBeVisible();

    await page.getByRole('button', { name: 'Excluir' }).click();
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
});
