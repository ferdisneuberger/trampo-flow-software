import { AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type AlertProps = {
  tone?: 'error' | 'info';
  title: string;
  description?: string;
  action?: ReactNode;
};

export function Alert({
  tone = 'error',
  title,
  description,
  action,
}: AlertProps) {
  const Icon = tone === 'error' ? AlertTriangle : Info;

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-start',
        tone === 'error'
          ? 'border-rose-100 bg-rose-50 text-rose-700'
          : 'border-sky-100 bg-sky-50 text-sky-700',
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="mt-1 text-sm leading-6 opacity-90">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
