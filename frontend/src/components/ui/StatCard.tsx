import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Card } from './Card';

type StatTone = 'brand' | 'amber' | 'sky' | 'emerald' | 'rose';

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: StatTone;
};

const toneClasses: Record<StatTone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">
            {value}
          </p>
        </div>
        <span
          className={cn(
            'grid size-11 place-items-center rounded-xl',
            toneClasses[tone],
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
