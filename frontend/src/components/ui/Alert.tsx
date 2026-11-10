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
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-start',
        tone === 'error'
          ? 'border-danger/30 bg-danger-soft'
          : 'border-info/30 bg-info-soft',
      )}
    >
      <Icon
        className={cn(
          'size-5 shrink-0',
          tone === 'error' ? 'text-danger' : 'text-info',
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {description && (
          <p className="mt-1 text-sm leading-6 text-fg-soft">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
