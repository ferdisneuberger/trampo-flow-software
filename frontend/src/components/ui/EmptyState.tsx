import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from './Card';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-xl border-2 border-ink-900 bg-yellow text-on-accent shadow-hard-sm">
        <Icon className="size-8" aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-bold tracking-[-0.04em] text-ink-900">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
