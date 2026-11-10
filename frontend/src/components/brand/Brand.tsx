import { cn } from '../../utils/cn';

type BrandSize = 'sm' | 'md' | 'lg';

const glyphSizeClasses: Record<BrandSize, string> = {
  sm: 'size-[18px]',
  md: 'size-5',
  lg: 'size-6',
};

const wordmarkSizeClasses: Record<BrandSize, string> = {
  sm: 'text-[15px]',
  md: 'text-base',
  lg: 'text-lg',
};

type BrandMarkProps = {
  size?: BrandSize;
  className?: string;
};

/**
 * Três barras decrescentes: as colunas do quadro vistas de longe. Desenhadas
 * em SVG com `currentColor` para seguir o tema claro e o escuro.
 */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 text-fg', className)}
    >
      <BrandGlyph className={glyphSizeClasses[size]} />
    </span>
  );
}

export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <rect x="2" y="2" width="4.5" height="16" rx="1.25" fill="currentColor" />
      <rect
        x="7.75"
        y="7"
        width="4.5"
        height="11"
        rx="1.25"
        fill="currentColor"
        opacity="0.7"
      />
      <rect
        x="13.5"
        y="11.5"
        width="4.5"
        height="6.5"
        rx="1.25"
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display font-semibold leading-none tracking-[-0.01em] text-fg',
        className,
      )}
    >
      trampo flow
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
      <BrandMark size={size} />
      <BrandWordmark
        className={cn(wordmarkSizeClasses[size], wordmarkClassName)}
      />
    </span>
  );
}
