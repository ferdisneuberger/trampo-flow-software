import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <span className="inline-block -rotate-1 border-2 border-ink-900 bg-yellow px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-on-accent shadow-hard-sm">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-[-0.06em] text-ink-900 sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
            {description}
          </p>
        )}
        {meta && (
          <div className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-500">
            {meta}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
