import {
  ArrowLeft,
  Building2,
  CalendarDays,
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
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useApplication } from '../hooks/useApplication';
import { useApplicationMutations } from '../hooks/useApplicationMutations';
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
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/candidaturas"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Candidaturas
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1
            title={application.title}
            className="line-clamp-2 break-words text-2xl font-semibold tracking-tight text-ink-900"
          >
            {application.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-700">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4" aria-hidden="true" />
              {companyUrl ? (
                <a
                  href={companyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline-offset-4 hover:text-brand-700 hover:underline"
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
      </div>

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

      <Card className="min-w-0 overflow-hidden p-0">
        <dl className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
          <div className="bg-white px-5 py-4 sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Fase atual
            </dt>
            <dd className="mt-1 text-base font-medium text-ink-900">
              {application.currentPhase}
            </dd>
          </div>

          <div
            className={
              companyUrl
                ? 'bg-white px-5 py-4'
                : 'bg-white px-5 py-4 sm:col-span-2'
            }
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Link da vaga
            </dt>
            <dd className="mt-1 min-w-0 text-sm">
              {jobUrl ? (
                <a
                  href={jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={application.link}
                  className="inline-flex max-w-full items-center gap-1.5 text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline"
                >
                  <span className="truncate">{formatUrlHost(jobUrl)}</span>
                  <ExternalLink
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                </a>
              ) : (
                <span className="break-all text-ink-700">
                  {application.link}
                </span>
              )}
            </dd>
          </div>

          {companyUrl && (
            <div className="bg-white px-5 py-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Site da empresa
              </dt>
              <dd className="mt-1 min-w-0 text-sm">
                <a
                  href={companyUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={application.companyUrl ?? undefined}
                  className="inline-flex max-w-full items-center gap-1.5 text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline"
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

          <div className="bg-white px-5 py-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
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

          <div className="bg-white px-5 py-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Atualizada em
            </dt>
            <dd className="mt-1 text-sm text-ink-900">
              {formatDate(application.updatedAt)}
            </dd>
          </div>
        </dl>
      </Card>

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
