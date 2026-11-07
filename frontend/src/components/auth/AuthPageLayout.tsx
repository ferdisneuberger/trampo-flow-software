import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { BrandLockup } from '../brand/Brand';
import { ThemeToggle } from '../ui/ThemeToggle';

type AuthPageLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
  tagline?: string;
  width?: 'md' | 'lg' | 'xl';
};

const widthClasses = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function AuthPageLayout({
  children,
  footer,
  tagline = 'Gestão de candidaturas',
  width = 'md',
}: AuthPageLayoutProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 sm:py-14">
      <div className="absolute right-3 top-3 z-10 sm:right-5 sm:top-5">
        <ThemeToggle variant="toolbar" />
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[7%] top-[12%] hidden -rotate-3 border-2 border-ink-900 bg-yellow px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-on-accent shadow-hard-sm lg:block"
      >
        Sem planilha
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[8%] top-[18%] hidden rotate-2 border-2 border-ink-900 bg-surface px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-ink-900 shadow-hard-sm lg:block"
      >
        Mais trampo
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[12%] right-[10%] hidden -rotate-2 border-2 border-ink-900 bg-coral px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-on-coral shadow-hard-sm lg:block"
      >
        Menos drama
      </span>

      <div className={cn('w-full', widthClasses[width])}>
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandLockup size="lg" />
          <p className="mt-3 font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
            {tagline}
          </p>
        </div>

        {children}

        <p className="mt-6 text-center font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink-500">
          {footer ?? 'Trampo Flow · feito pra quem corre atrás'}
        </p>
      </div>
    </main>
  );
}
