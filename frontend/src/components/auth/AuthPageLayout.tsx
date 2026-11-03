import { Briefcase } from 'lucide-react';
import type { ReactNode } from 'react';
import { env } from '../../config/env';
import { cn } from '../../utils/cn';

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
    <div className="app-shell flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:py-14">
      <div className={cn('w-full', widthClasses[width])}>
        <div className="mb-7 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white">
            <Briefcase className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-900">
            {env.appName}
          </h1>
          <p className="mt-1 text-sm text-ink-500">{tagline}</p>
        </div>

        {children}

        <p className="mt-6 text-center text-xs text-ink-500">
          {footer ?? `${env.appName} · ambiente privado`}
        </p>
      </div>
    </div>
  );
}
