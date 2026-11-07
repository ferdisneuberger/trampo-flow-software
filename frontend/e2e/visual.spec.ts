import { expect, test, type Page } from '@playwright/test';
import type { ApplicationBoard } from '../src/services/applications.types';
import {
  boardFixture,
  detailFixture,
  emptyBoardFixture,
  visualUser,
} from './fixtures';

type MockApiOptions = {
  authenticated?: boolean;
  board?: ApplicationBoard;
  theme?: 'light' | 'dark' | 'system';
};

const screenshotOptions = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.01,
};

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('trampo-flow:theme', value);
  }, theme);
}

async function mockApi(
  page: Page,
  {
    authenticated = true,
    board = boardFixture,
    theme = 'light',
  }: MockApiOptions = {},
) {
  let currentTheme = theme;

  await page.route('**/api/auth/refresh', (route) => {
    if (!authenticated) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Sem sessão' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'visual-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        expiresAt: Date.now() + 3_600_000,
      }),
    });
  });

  await page.route('**/api/auth/me/theme', async (route) => {
    const body = route.request().postDataJSON() as {
      themePreference: 'light' | 'dark' | 'system';
    };

    currentTheme = body.themePreference;

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...visualUser, themePreference: currentTheme }),
    });
  });

  await page.route('**/api/auth/me', (route) => {
    if (!authenticated) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Sem sessão' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...visualUser, themePreference: currentTheme }),
    });
  });

  await page.route('**/api/applications/**', (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/applications/board') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(board),
      });
    }

    if (url.pathname === `/api/applications/${detailFixture.id}`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(detailFixture),
      });
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Não encontrada' }),
    });
  });
}

async function waitForFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

test.describe('regressão visual', () => {
  test('alterna e persiste o tema', async ({ page }) => {
    await mockApi(page);
    await page.goto('/candidaturas');
    await expect(
      page.getByRole('heading', { name: 'Meus trampos' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Tema: Claro' }).first().click();
    await page.getByRole('menuitemradio', { name: 'Escuro' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('login claro', async ({ page }) => {
    await setTheme(page, 'light');
    await mockApi(page, { authenticated: false });
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: 'Entrar na conta' }),
    ).toBeVisible();
    await waitForFonts(page);

    await expect(page).toHaveScreenshot('login-light.png', screenshotOptions);
  });

  test('login escuro', async ({ page }) => {
    await setTheme(page, 'dark');
    await mockApi(page, { authenticated: false });
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: 'Entrar na conta' }),
    ).toBeVisible();
    await waitForFonts(page);

    await expect(page).toHaveScreenshot('login-dark.png', screenshotOptions);
  });

  test('quadro claro', async ({ page }) => {
    await setTheme(page, 'light');
    await mockApi(page);
    await page.goto('/candidaturas');
    await expect(
      page.getByRole('heading', { name: 'Meus trampos' }),
    ).toBeVisible();
    await waitForFonts(page);

    await expect(page).toHaveScreenshot('board-light.png', screenshotOptions);
  });

  test('quadro escuro', async ({ page }) => {
    await setTheme(page, 'dark');
    await mockApi(page, { theme: 'dark' });
    await page.goto('/candidaturas');
    await expect(
      page.getByRole('heading', { name: 'Meus trampos' }),
    ).toBeVisible();
    await waitForFonts(page);

    await expect(page).toHaveScreenshot('board-dark.png', screenshotOptions);
  });

  test('quadro vazio', async ({ page }) => {
    await setTheme(page, 'light');
    await mockApi(page, { board: emptyBoardFixture });
    await page.goto('/candidaturas');
    await expect(
      page.getByRole('heading', { name: 'Comece seu quadro de candidaturas' }),
    ).toBeVisible();
    await waitForFonts(page);

    await expect(page).toHaveScreenshot('board-empty.png', screenshotOptions);
  });

  test('detalhe da candidatura', async ({ page }) => {
    await setTheme(page, 'light');
    await mockApi(page);
    await page.goto(`/candidaturas/${detailFixture.id}`);
    await expect(
      page.getByRole('heading', { name: detailFixture.title }),
    ).toBeVisible();
    await waitForFonts(page);

    await expect(page).toHaveScreenshot('detail-light.png', screenshotOptions);
  });

  test('modal de nova candidatura', async ({ page }) => {
    await setTheme(page, 'light');
    await mockApi(page);
    await page.goto('/candidaturas');
    await page.getByRole('button', { name: 'Nova candidatura' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Nova candidatura' }),
    ).toBeVisible();
    await waitForFonts(page);

    await expect(page).toHaveScreenshot('board-modal.png', screenshotOptions);
  });

  test('404', async ({ page }) => {
    await setTheme(page, 'light');
    await mockApi(page);
    await page.goto('/pagina-que-nao-existe');
    await expect(
      page.getByRole('heading', { name: 'Página não encontrada' }),
    ).toBeVisible();
    await waitForFonts(page);

    await expect(page).toHaveScreenshot('not-found.png', screenshotOptions);
  });

  test.describe('mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('quadro mobile', async ({ page }) => {
      await setTheme(page, 'light');
      await mockApi(page);
      await page.goto('/candidaturas');
      await expect(
        page.getByRole('heading', { name: 'Meus trampos' }),
      ).toBeVisible();
      await waitForFonts(page);

      await expect(page).toHaveScreenshot(
        'board-mobile.png',
        screenshotOptions,
      );
    });

    test('drawer mobile', async ({ page }) => {
      await setTheme(page, 'light');
      await mockApi(page);
      await page.goto('/candidaturas');
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await expect(
        page.getByRole('navigation', { name: 'Principal' }),
      ).toBeVisible();
      await waitForFonts(page);

      await expect(page).toHaveScreenshot(
        'drawer-mobile.png',
        screenshotOptions,
      );
    });
  });
});
