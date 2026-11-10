import { cn } from '../../utils/cn';

export type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-accent text-on-accent hover:bg-accent-hover',
  secondary:
    'border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-2',
  ghost: 'border-transparent text-fg-soft hover:bg-surface-2 hover:text-fg',
  danger: 'border-transparent bg-danger text-on-danger hover:bg-danger-hover',
  'danger-ghost':
    'border-danger/40 bg-transparent text-danger hover:bg-danger-soft',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-[42px] px-4 text-sm',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}
