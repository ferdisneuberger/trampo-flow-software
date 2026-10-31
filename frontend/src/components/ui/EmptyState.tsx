import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from './Card';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-semibold tracking-tight text-ink-900">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
