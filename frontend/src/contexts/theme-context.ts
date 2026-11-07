import { createContext, useContext } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light';
export const THEME_STORAGE_KEY = 'trampo-flow:theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * `local`: o usuário escolheu o tema nesta aba e ele precisa ir para a conta.
 * `external`: o tema veio da conta ou de outra aba e não deve ser reenviado.
 */
export type ThemeChangeOrigin = 'local' | 'external';

export type SetThemeOptions = {
  origin?: ThemeChangeOrigin;
};

export type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  /** Origem da última mudança de tema; o padrão inicial é `external`. */
  origin: ThemeChangeOrigin;
  setTheme: (theme: ThemePreference, options?: SetThemeOptions) => void;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.');
  }

  return context;
}
