import { Briefcase, Plus } from 'lucide-react';
import type { Application } from '../../services/applications.types';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ApplicationCard } from './ApplicationCard';

type ApplicationListProps = {
  applications: Application[];
  onCreate: () => void;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

export function ApplicationList({
  applications,
  onCreate,
  onEdit,
  onDelete,
}: ApplicationListProps) {
  if (applications.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Nenhuma candidatura por aqui"
        description="Registre a primeira vaga que você está acompanhando para manter fases, links e arquivos organizados."
        action={
          <Button type="button" onClick={onCreate}>
            <Plus className="size-4" aria-hidden="true" />
            Nova candidatura
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {applications.map((application) => (
        <ApplicationCard
          key={application.id}
          application={application}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
