import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApplicationStatusBadge } from '../components/applications/ApplicationStatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { useStats } from '../hooks/useStats';
import { applicationsService } from '../services/api/applications.service';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from '../services/applications.types';
import { daysSince, formatDate } from '../utils/format';

function useRecentApplications() {
  return useQuery({
    queryKey: ['applications', 'recent', 5],
    queryFn: () => applicationsService.listPage({ sort: 'recent', limit: 5 }),
    select: (page) => page.items,
  });
}

function useStaleApplications() {
  return useQuery({
    queryKey: ['applications', 'stale', 5],
    queryFn: () => applicationsService.listPage({ sort: 'stale', limit: 5 }),
    select: (page) => page.items,
  });
}

export function DashboardPage() {
  const stats = useStats();
  const recent = useRecentApplications();
  const stale = useStaleApplications();

  const total = stats.data?.total ?? 0;
  const byStatus = stats.data?.byStatus;

  if (stats.isPending) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded bg-white" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-card border border-line bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Painel"
          description="Visão geral das candidaturas."
        />
        <EmptyState
          icon={Clock}
          title="Nada por aqui ainda"
          description="Cadastre a primeira candidatura para acompanhar o funil."
          action={
            <Link to="/candidaturas">
              <Button type="button">
                <Plus className="size-4" aria-hidden="true" />
                Ir para candidaturas
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        description="Visão geral das candidaturas e do que precisa de atenção."
        actions={
          <Link to="/candidaturas">
            <Button type="button" variant="secondary">
              Ver todas
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-2xl font-semibold tracking-tight text-ink-900">
            {total}
          </p>
          <p className="mt-0.5 text-xs text-ink-500">Total</p>
        </Card>

        {APPLICATION_STATUSES.map((status) => (
          <Card
            key={status}
            className={
              status === 'IN_PROGRESS'
                ? 'border-brand-200 bg-brand-50 p-4'
                : 'p-4'
            }
          >
            <p className="text-2xl font-semibold tracking-tight text-ink-900">
              {byStatus?.[status] ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              {APPLICATION_STATUS_LABELS[status]}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-900">
              Paradas há mais tempo
            </h2>
            <Link
              to="/candidaturas"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Ver todas
            </Link>
          </div>

          {stale.data && stale.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {stale.data.map((application) => (
                <li key={application.id}>
                  <Link
                    to={`/candidaturas/${application.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {application.title}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {application.company} · {application.currentPhase}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-500">
                      {daysSince(application.updatedAt)} dias
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-ink-500">
              Nenhuma candidatura parada.
            </p>
          )}
        </Card>

        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-900">Recentes</h2>
            <Link
              to="/candidaturas"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Ver todas
            </Link>
          </div>

          {recent.data && recent.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {recent.data.map((application) => (
                <li key={application.id}>
                  <Link
                    to={`/candidaturas/${application.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {application.title}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {application.company} ·{' '}
                        {formatDate(application.createdAt)}
                      </p>
                    </div>
                    <ApplicationStatusBadge status={application.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-ink-500">
              Nenhuma candidatura recente.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
