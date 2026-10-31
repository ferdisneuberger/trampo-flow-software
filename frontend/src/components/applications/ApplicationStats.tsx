import { Briefcase, CheckCircle2, Clock, Timer, XCircle } from 'lucide-react';
import type { Application } from '../../services/applications.types';
import { countApplicationsByStatus } from '../../utils/applications';
import { StatCard } from '../ui/StatCard';

type ApplicationStatsProps = {
  applications: Application[];
};

export function ApplicationStats({ applications }: ApplicationStatsProps) {
  const counts = countApplicationsByStatus(applications);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Total"
        value={applications.length}
        icon={Briefcase}
        tone="brand"
      />
      <StatCard
        label="Aguardando"
        value={counts.PENDING}
        icon={Clock}
        tone="amber"
      />
      <StatCard
        label="Em andamento"
        value={counts.IN_PROGRESS}
        icon={Timer}
        tone="sky"
      />
      <StatCard
        label="Finalizadas"
        value={counts.COMPLETED}
        icon={CheckCircle2}
        tone="emerald"
      />
      <StatCard
        label="Recusadas"
        value={counts.REJECTED}
        icon={XCircle}
        tone="rose"
      />
    </div>
  );
}
