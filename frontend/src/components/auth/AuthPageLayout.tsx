import type { ReactNode } from 'react';
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '../../services/applications.types';
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
  xl: 'max-w-3xl',
};

const statusDotClasses: Record<ApplicationStatus, string> = {
  PENDING: 'bg-status-pending',
  IN_PROGRESS: 'bg-status-progress',
  COMPLETED: 'bg-status-done',
  REJECTED: 'bg-status-rejected',
};

const statusTextClasses: Record<ApplicationStatus, string> = {
  PENDING: 'bg-status-pending/15 text-status-pending',
  IN_PROGRESS: 'bg-status-progress/15 text-status-progress',
  COMPLETED: 'bg-status-done/15 text-status-done',
  REJECTED: 'bg-status-rejected/15 text-status-rejected',
};

/** Exemplos fixos e decorativos do painel lateral; não são dados do usuário. */
const previewItems: {
  title: string;
  detail: string;
  status: ApplicationStatus;
}[] = [
  {
    title: 'Desenvolvedor Full-stack',
    detail: 'Vértice Saúde · Entrevista técnica',
    status: 'IN_PROGRESS',
  },
  {
    title: 'Engenheiro Backend Sênior',
    detail: 'Lumen Educação · Teste prático',
    status: 'IN_PROGRESS',
  },
  {
    title: 'Desenvolvedor Node.js',
    detail: 'Rota Logística · Triagem do RH',
    status: 'PENDING',
  },
  {
    title: 'Software Engineer',
    detail: 'Maré Mobilidade · Proposta recebida',
    status: 'COMPLETED',
  },
];

function BoardPreview() {
  return (
    <ul
      aria-hidden="true"
      className="mt-9 overflow-hidden rounded-card border border-line"
    >
      {previewItems.map((item) => (
        <li
          key={item.title}
          className="flex items-center gap-3 border-t border-line bg-surface px-4 py-3 first:border-t-0 dark:bg-canvas"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-fg">
              {item.title}
            </span>
            <span className="block truncate text-[13px] text-muted">
              {item.detail}
            </span>
          </span>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
              statusTextClasses[item.status],
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                statusDotClasses[item.status],
              )}
            />
            {APPLICATION_STATUS_LABELS[item.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AuthPageLayout({
  children,
  footer,
  tagline = 'Gestão de candidaturas',
  width = 'md',
}: AuthPageLayoutProps) {
  const footerContent = footer ?? 'Trampo Flow · feito pra quem corre atrás';

  // Páginas largas (como os termos) usam uma coluna única de documento.
  if (width !== 'md') {
    return (
      <main className="min-h-screen px-5 py-6 sm:px-8 sm:py-8">
        <div className={cn('mx-auto w-full', widthClasses[width])}>
          <header className="mb-12 flex items-center gap-3">
            <BrandLockup size="md" />
            <span className="hidden text-[13px] text-muted sm:inline">
              {tagline}
            </span>
            <div className="ml-auto">
              <ThemeToggle variant="toolbar" />
            </div>
          </header>

          {children}

          <p className="mt-10 text-[13px] text-muted">{footerContent}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col border-r border-line bg-canvas px-12 py-10 lg:flex dark:bg-surface">
        <BrandLockup size="md" />
        <div className="my-auto max-w-[460px] py-12">
          <p className="text-[30px] font-medium leading-tight tracking-[-0.02em] text-fg">
            Cada vaga, cada fase, cada retorno. Num quadro que você entende de
            relance.
          </p>
          <BoardPreview />
        </div>
        <p className="text-[13px] text-muted">{tagline}</p>
      </aside>

      <div className="flex min-w-0 flex-col bg-surface px-5 py-5 sm:px-8 sm:py-6 dark:bg-canvas">
        <div className="flex items-center gap-3">
          <span className="lg:hidden">
            <BrandLockup size="md" />
          </span>
          <div className="ml-auto">
            <ThemeToggle variant="toolbar" />
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center pb-6 pt-10 lg:items-center lg:pt-6">
          <div className="w-full max-w-[380px]">
            {children}
            <p className="mt-10 text-[13px] text-muted">{footerContent}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
