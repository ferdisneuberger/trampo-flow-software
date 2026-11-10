import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Compass,
  ExternalLink,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApplicationForm } from '../components/applications/ApplicationForm';
import { ApplicationStatusBadge } from '../components/applications/ApplicationStatusBadge';
import { DeleteApplicationDialog } from '../components/applications/DeleteApplicationDialog';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useApplication } from '../hooks/useApplication';
import { useApplicationMutations } from '../hooks/useApplicationMutations';
import { cn } from '../utils/cn';
import { getErrorMessage } from '../utils/errors';
import { formatDate } from '../utils/format';
import { formatUrlHost, safeHttpUrl } from '../utils/url';

export function ApplicationDetailPage() {
  const { id } = useParams();
  const applicationId = id ?? '';
  const navigate = useNavigate();
  const query = useApplication(applicationId);
  const { createApplication, updateApplication } = useApplicationMutations();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const application = query.data;

  if (query.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        icon={FileText}
        title="Não foi possível carregar a candidatura"
        description={getErrorMessage(query.error)}
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void query.refetch()}
            >
              Tentar novamente
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                void navigate('/candidaturas');
              }}
            >
              Voltar para o quadro
            </Button>
          </div>
        }
      />
    );
  }

  if (!application) {
    return (
      <EmptyState
        icon={FileText}
        title="Candidatura não encontrada"
        description="Ela pode ter sido excluída ou pertence a outra conta."
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void navigate('/candidaturas');
            }}
          >
            Voltar para o quadro
          </Button>
        }
      />
    );
  }

  const companyUrl = safeHttpUrl(application.companyUrl);
  const jobUrl = safeHttpUrl(application.link);

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        to="/candidaturas"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Meus trampos
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">Candidatura</p>
          <h1
            title={application.title}
            className="mt-1 line-clamp-2 break-words font-display text-[28px] font-semibold leading-tight text-fg sm:text-[30px]"
          >
            {application.title}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4" aria-hidden="true" />
              {companyUrl ? (
                <a
                  href={companyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-fg"
                >
                  {application.company}
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ) : (
                application.company
              )}
            </span>
            <ApplicationStatusBadge status={application.status} />
          </div>
        </div>

        <div className="flex gap-2 lg:shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsEditing(true)}
            className="flex-1 sm:flex-none"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Button>
          <Button
            type="button"
            variant="danger-ghost"
            onClick={() => setIsDeleteOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir
          </Button>
        </div>
      </header>

      {feedback && (
        <Alert
          tone="info"
          title={feedback}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFeedback(null)}
            >
              Fechar
            </Button>
          }
        />
      )}

      <dl className="grid grid-cols-1 overflow-hidden rounded-card border border-line bg-surface sm:grid-cols-2">
        <div className="border-b border-line px-5 py-4 sm:col-span-2">
          <dt className="text-[13px] text-muted">Fase atual</dt>
          <dd className="mt-1 font-display text-xl font-semibold text-fg">
            {application.currentPhase}
          </dd>
        </div>

        <div
          className={cn(
            'border-b border-line px-5 py-4',
            companyUrl ? 'sm:border-r' : 'sm:col-span-2',
          )}
        >
          <dt className="text-[13px] text-muted">Link da vaga</dt>
          <dd className="mt-1 min-w-0 text-sm">
            {jobUrl ? (
              <a
                href={jobUrl}
                target="_blank"
                rel="noreferrer"
                title={application.link}
                className="inline-flex max-w-full items-center gap-1.5 text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg"
              >
                <span className="truncate">{formatUrlHost(jobUrl)}</span>
                <ExternalLink
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <span className="break-all text-fg-soft">{application.link}</span>
            )}
          </dd>
        </div>

        {companyUrl && (
          <div className="border-b border-line px-5 py-4">
            <dt className="text-[13px] text-muted">Site da empresa</dt>
            <dd className="mt-1 min-w-0 text-sm">
              <a
                href={companyUrl}
                target="_blank"
                rel="noreferrer"
                title={application.companyUrl ?? undefined}
                className="inline-flex max-w-full items-center gap-1.5 text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg"
              >
                <span className="truncate">{formatUrlHost(companyUrl)}</span>
                <ExternalLink
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
              </a>
            </dd>
          </div>
        )}

        <div
          className={cn(
            'border-b border-line px-5 py-4 sm:border-b-0',
            companyUrl && 'sm:border-r',
          )}
        >
          <dt className="text-[13px] text-muted">Criada em</dt>
          <dd className="mt-1 inline-flex items-center gap-1.5 text-sm text-fg">
            <CalendarDays className="size-3.5 text-muted" aria-hidden="true" />
            {formatDate(application.createdAt)}
          </dd>
        </div>

        <div className="px-5 py-4">
          <dt className="text-[13px] text-muted">Atualizada em</dt>
          <dd className="mt-1 text-sm text-fg">
            {formatDate(application.updatedAt)}
          </dd>
        </div>
      </dl>

      <aside className="flex items-start gap-3 rounded-card border border-line bg-surface-2 p-5 text-fg">
        <span className="grid size-9 shrink-0 place-items-center rounded-btn bg-surface text-fg-soft">
          <Compass className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold text-fg">
            Mantém o ritmo
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Nessa fase, se a empresa não responder, vale um follow-up curto e
            educado — sem drama.
          </p>
        </div>
      </aside>

      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Editar candidatura"
        description="Atualize os dados do processo seletivo."
        size="lg"
      >
        <ApplicationForm
          key={application.id}
          application={application}
          onCreate={createApplication}
          onUpdate={updateApplication}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            setFeedback('Candidatura atualizada com sucesso.');
          }}
        />
      </Modal>

      <DeleteApplicationDialog
        key={`${application.id}-${isDeleteOpen}`}
        application={application}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={() => {
          void navigate('/candidaturas', { replace: true });
        }}
      />
    </div>
  );
}
