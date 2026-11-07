import { cn } from '../../utils/cn';

export type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-ink-900 bg-coral text-on-coral shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-coral hover:shadow-hard active:translate-x-0 active:translate-y-0 active:shadow-hard-sm',
  secondary:
    'border-ink-900 bg-surface text-ink-900 shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-raised hover:shadow-hard active:translate-x-0 active:translate-y-0 active:shadow-hard-sm',
  ghost:
    'border-transparent text-ink-700 hover:border-ink-900 hover:bg-surface/60 hover:text-ink-900',
  danger:
    'border-ink-900 bg-danger-strong text-white shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-danger-strong-hover hover:shadow-hard active:translate-x-0 active:translate-y-0 active:shadow-hard-sm',
  'danger-ghost':
    'border-coral bg-transparent text-coral-dark hover:bg-coral/10',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
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
    'inline-flex items-center justify-center gap-2 rounded-btn border-2 font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt/20 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-60',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}
