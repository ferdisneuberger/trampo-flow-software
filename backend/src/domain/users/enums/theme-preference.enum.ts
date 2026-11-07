export enum ThemePreference {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export const DEFAULT_THEME_PREFERENCE = ThemePreference.LIGHT;

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    value === ThemePreference.LIGHT ||
    value === ThemePreference.DARK ||
    value === ThemePreference.SYSTEM
  );
}
