import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTheme, type ThemePreference } from '../../contexts/theme-context';
import { Menu, type MenuItem } from '../ui/Menu';

const themeLabels: Record<ThemePreference, string> = {
  light: 'Claro',
  dark: 'Escuro',
  system: 'Sistema',
};

const themeIcons: Record<ThemePreference, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const themeOrder: ThemePreference[] = ['light', 'dark', 'system'];

type ThemeToggleProps = {
  variant?: 'default' | 'toolbar';
};

export function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const CurrentIcon = themeIcons[theme];

  const items: MenuItem[] = themeOrder.map((option) => {
    const Icon = themeIcons[option];

    return {
      id: `theme-${option}`,
      label: themeLabels[option],
      icon: Icon,
      checked: theme === option,
      onSelect: () => setTheme(option),
    };
  });

  return (
    <Menu
      label={`Tema: ${themeLabels[theme]}`}
      items={items}
      trigger={<CurrentIcon className="size-4" aria-hidden="true" />}
      triggerVariant={variant}
      menuClassName="w-40"
    />
  );
}
