import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeContext';
import { THEME_STORAGE_KEY, useTheme } from './theme-context';

function Probe() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div>
      <span data-testid="preference">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setTheme('light')}>
        Claro
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        Escuro
      </button>
      <button type="button" onClick={() => setTheme('system')}>
        Sistema
      </button>
    </div>
  );
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  it('começa no claro por padrão, mesmo com o sistema escuro', () => {
    mockMatchMedia(true);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('light');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('aplica e persiste o tema escuro', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Escuro' }));

    expect(screen.getByTestId('preference')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('respeita a preferência escura do sistema quando o usuário escolhe sistema', async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');

    await user.click(screen.getByRole('button', { name: 'Sistema' }));

    await waitFor(() =>
      expect(screen.getByTestId('resolved')).toHaveTextContent('dark'),
    );
    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('restaura o tema salvo antes da primeira renderização', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
  });
});
