import {
  Briefcase,
  CheckCircle2,
  Clock,
  Timer,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '../../services/applications.types';
import { cn } from '../../utils/cn';
import { Card } from '../ui/Card';

export type ApplicationStatusFilter = ApplicationStatus | 'ALL';

type StatusTab = {
  value: ApplicationStatusFilter;
  label: string;
  icon: LucideIcon;
};

const statusTabs: StatusTab[] = [
  { value: 'ALL', label: 'Todas', icon: Briefcase },
  {
    value: 'PENDING',
    label: APPLICATION_STATUS_LABELS.PENDING,
    icon: Clock,
  },
  {
    value: 'IN_PROGRESS',
    label: APPLICATION_STATUS_LABELS.IN_PROGRESS,
    icon: Timer,
  },
  {
    value: 'COMPLETED',
    label: APPLICATION_STATUS_LABELS.COMPLETED,
    icon: CheckCircle2,
  },
  {
    value: 'REJECTED',
    label: APPLICATION_STATUS_LABELS.REJECTED,
    icon: XCircle,
  },
];

type ApplicationStatusTabsProps = {
  value: ApplicationStatusFilter;
  counts: Record<ApplicationStatus, number>;
  total: number;
  onChange: (value: ApplicationStatusFilter) => void;
};

export function ApplicationStatusTabs({
  value,
  counts,
  total,
  onChange,
}: ApplicationStatusTabsProps) {
  return (
    <Card className="p-1.5">
      <div
        role="group"
        aria-label="Filtrar candidaturas por status"
        className="flex flex-wrap gap-1"
      >
        {statusTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = value === tab.value;
          const count = tab.value === 'ALL' ? total : counts[tab.value];

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              aria-pressed={isActive}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:flex-none',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-ink-500 hover:bg-surface hover:text-ink-900',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-surface text-ink-500',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
