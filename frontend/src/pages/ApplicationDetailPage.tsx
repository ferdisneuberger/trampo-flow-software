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
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        to="/candidaturas"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-ink-500 transition hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Meus trampos
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-coral-dark">
            Candidatura
          </p>
          <h1
            title={application.title}
            className="mt-2 line-clamp-2 break-words font-display text-4xl font-extrabold leading-[0.95] tracking-[-0.06em] text-ink-900"
          >
            {application.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-700">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4" aria-hidden="true" />
              {companyUrl ? (
                <a
                  href={companyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-cobalt"
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

      <dl className="grid grid-cols-1 overflow-hidden rounded-card border-2 border-ink-900 bg-surface shadow-hard sm:grid-cols-2">
        <div className="border-b-2 border-ink-900 bg-accent-soft px-5 py-4 sm:col-span-2">
          <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink-500">
            Fase atual
          </dt>
          <dd className="mt-1 font-display text-2xl font-bold tracking-[-0.04em] text-ink-900">
            {application.currentPhase}
          </dd>
        </div>

        <div
          className={cn(
            'border-b-2 border-ink-900 px-5 py-4',
            companyUrl ? 'sm:border-r-2' : 'sm:col-span-2',
          )}
        >
          <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink-500">
            Link da vaga
          </dt>
          <dd className="mt-1 min-w-0 text-sm">
            {jobUrl ? (
              <a
                href={jobUrl}
                target="_blank"
                rel="noreferrer"
                title={application.link}
                className="inline-flex max-w-full items-center gap-1.5 text-cobalt underline underline-offset-4 hover:text-ink-900"
              >
                <span className="truncate">{formatUrlHost(jobUrl)}</span>
                <ExternalLink
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <span className="break-all text-ink-700">{application.link}</span>
            )}
          </dd>
        </div>

        {companyUrl && (
          <div className="border-b-2 border-ink-900 px-5 py-4">
            <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink-500">
              Site da empresa
            </dt>
            <dd className="mt-1 min-w-0 text-sm">
              <a
                href={companyUrl}
                target="_blank"
                rel="noreferrer"
                title={application.companyUrl ?? undefined}
                className="inline-flex max-w-full items-center gap-1.5 text-cobalt underline underline-offset-4 hover:text-ink-900"
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
            'border-b-2 border-ink-900 px-5 py-4 sm:border-b-0',
            companyUrl && 'sm:border-r-2',
          )}
        >
          <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink-500">
            Criada em
          </dt>
          <dd className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-900">
            <CalendarDays
              className="size-3.5 text-ink-500"
              aria-hidden="true"
            />
            {formatDate(application.createdAt)}
          </dd>
        </div>

        <div className="px-5 py-4">
          <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink-500">
            Atualizada em
          </dt>
          <dd className="mt-1 text-sm text-ink-900">
            {formatDate(application.updatedAt)}
          </dd>
        </div>
      </dl>

      <aside className="flex items-start gap-3 rounded-xl border-2 border-ink-900 bg-tip-bg p-5 text-tip-text shadow-hard">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border-2 border-ink-900 bg-yellow text-on-accent">
          <Compass className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
            Mantém o ritmo
          </h2>
          <p className="mt-1 text-sm leading-6 text-tip-muted">
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
