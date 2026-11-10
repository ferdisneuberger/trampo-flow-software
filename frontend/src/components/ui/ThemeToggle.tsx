import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTheme, type ThemePreference } from '../../contexts/theme-context';
import { cn } from '../../utils/cn';
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
  /** Classes extras do menu, por exemplo para abrir para cima na barra lateral. */
  menuClassName?: string;
};

export function ThemeToggle({
  variant = 'default',
  menuClassName,
}: ThemeToggleProps) {
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
      menuClassName={cn('w-40', menuClassName)}
    />
  );
}
