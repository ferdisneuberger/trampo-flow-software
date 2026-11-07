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
        'flex flex-col gap-4 rounded-xl border-2 border-ink-900 p-4 shadow-hard-sm sm:flex-row sm:items-start',
        tone === 'error' ? 'bg-danger-soft' : 'bg-warning-soft',
      )}
    >
      <Icon
        className={cn(
          'size-5 shrink-0',
          tone === 'error' ? 'text-coral-dark' : 'text-cobalt',
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink-900">{title}</p>
        {description && (
          <p className="mt-1 text-sm leading-6 text-ink-700">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
