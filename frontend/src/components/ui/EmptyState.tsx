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
      <span className="grid size-12 place-items-center rounded-card border border-line bg-surface-2 text-muted">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-display text-xl font-semibold text-fg">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
