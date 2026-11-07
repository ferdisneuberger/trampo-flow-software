import { cn } from '../../utils/cn';

type BrandSize = 'sm' | 'md' | 'lg';

const markSizeClasses: Record<BrandSize, string> = {
  sm: 'size-9 rounded-[9px]',
  md: 'size-10 rounded-[11px]',
  lg: 'size-12 rounded-[13px]',
};

const glyphSizeClasses: Record<BrandSize, string> = {
  sm: 'size-5',
  md: 'size-6',
  lg: 'size-7',
};

type BrandMarkProps = {
  size?: BrandSize;
  className?: string;
};

/**
 * T de quadro: monograma da marca. O T amarelo e o card coral são desenhados
 * em SVG para funcionar bem no tile, no favicon e em tamanhos pequenos.
 */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center border-2 border-ink-900 bg-brand-tile text-yellow shadow-[3px_3px_0_var(--color-shadow)]',
        markSizeClasses[size],
        className,
      )}
    >
      <BrandGlyph className={glyphSizeClasses[size]} />
    </span>
  );
}

export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect
        x="3.25"
        y="4.5"
        width="17.5"
        height="5"
        rx="1.3"
        fill="currentColor"
      />
      <rect
        x="10.5"
        y="4.5"
        width="3"
        height="12.5"
        rx="0.7"
        fill="currentColor"
      />
      <rect
        x="13.2"
        y="14.2"
        width="6.2"
        height="5.2"
        rx="1.2"
        fill="#ff5a3c"
      />
      <rect
        x="14.8"
        y="16"
        width="3"
        height="0.9"
        rx="0.45"
        fill="#171512"
        opacity="0.55"
      />
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display text-2xl font-extrabold leading-none tracking-[-0.06em] text-ink-900',
        className,
      )}
    >
      trampo <span className="text-coral-dark">flow</span>
    </span>
  );
}

type BrandLockupProps = {
  size?: BrandSize;
  className?: string;
  wordmarkClassName?: string;
};

export function BrandLockup({
  size = 'md',
  className,
  wordmarkClassName,
}: BrandLockupProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandMark size={size} className="-rotate-3" />
      <BrandWordmark className={wordmarkClassName} />
    </span>
  );
}
