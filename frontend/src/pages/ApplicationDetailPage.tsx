import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApplicationForm } from '../components/applications/ApplicationForm';
import {
  FileUploader,
  MAX_FILES_PER_APPLICATION,
} from '../components/applications/FileUploader';
import { ApplicationStatusBadge } from '../components/applications/ApplicationStatusBadge';
import { DeleteApplicationDialog } from '../components/applications/DeleteApplicationDialog';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useApplication } from '../hooks/useApplication';
import { useApplicationMutations } from '../hooks/useApplicationMutations';
import { applicationsService } from '../services/api/applications.service';
import { downloadBlob } from '../utils/download';
import { getErrorMessage } from '../utils/errors';
import { formatDate, formatFileSize } from '../utils/format';
import { safeApiPath, safeHttpUrl } from '../utils/url';

export function ApplicationDetailPage() {
  const { id } = useParams();
  const applicationId = id ?? '';
  const navigate = useNavigate();
  const query = useApplication(applicationId);
  const {
    createApplication,
    updateApplication,
    uploadApplicationFile,
    removeApplicationFile,
  } = useApplicationMutations();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isRemovingFile, setIsRemovingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleDownload = async (downloadUrl: string, name: string) => {
    setDownloadError(null);

    try {
      const blob = await applicationsService.downloadFile(downloadUrl);
      downloadBlob(blob, name);
    } catch (error) {
      setDownloadError(getErrorMessage(error));
    }
  };

  const handleRemoveFile = async () => {
    if (!fileToDelete) {
      return;
    }

    setIsRemovingFile(true);
    setFileError(null);

    try {
      await removeApplicationFile(applicationId, fileToDelete);
      setFileToDelete(null);
      setFeedback('Arquivo removido.');
    } catch (error) {
      setFileError(getErrorMessage(error));
    } finally {
      setIsRemovingFile(false);
    }
  };

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
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
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

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => setIsDeleteOpen(true)}
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

      {downloadError && (
        <Alert
          tone="error"
          title="Não foi possível baixar o arquivo"
          description={downloadError}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-0">
          <dl className="divide-y divide-line">
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Fase atual
              </dt>
              <dd className="mt-0.5 text-sm text-ink-900">
                {application.currentPhase}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Link da vaga
              </dt>
              <dd className="mt-0.5 truncate text-sm">
                {jobUrl ? (
                  <a
                    href={jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline"
                  >
                    {application.link}
                  </a>
                ) : (
                  <span className="text-ink-700">{application.link}</span>
                )}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Criada em
              </dt>
              <dd className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-ink-900">
                <CalendarDays
                  className="size-3.5 text-ink-500"
                  aria-hidden="true"
                />
                {formatDate(application.createdAt)}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Atualizada em
              </dt>
              <dd className="mt-0.5 text-sm text-ink-900">
                {formatDate(application.updatedAt)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-0">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-900">
              Arquivos ({application.files.length}/{MAX_FILES_PER_APPLICATION})
            </h2>
          </div>

          {application.files.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-500">
              Nenhum arquivo anexado.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {application.files.map((file) => {
                const downloadUrl = safeApiPath(file.downloadUrl);
                const legacyUrl = safeHttpUrl(file.url);

                return (
                  <li
                    key={file.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-ink-500">
                      <FileText className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatFileSize(file.sizeInBytes)} · {file.mimeType}
                      </p>
                    </div>

                    {downloadUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleDownload(downloadUrl, file.name)
                        }
                        aria-label={`Baixar ${file.name}`}
                        className="rounded p-2 text-ink-500 hover:bg-surface hover:text-ink-700"
                      >
                        <Download className="size-4" aria-hidden="true" />
                      </button>
                    ) : legacyUrl ? (
                      <a
                        href={legacyUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir ${file.name}`}
                        className="rounded p-2 text-ink-500 hover:bg-surface hover:text-ink-700"
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </a>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setFileError(null);
                        setFileToDelete(file.id);
                      }}
                      aria-label={`Remover ${file.name}`}
                      className="rounded p-2 text-ink-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-line p-4">
            <FileUploader
              remaining={MAX_FILES_PER_APPLICATION - application.files.length}
              onUpload={async (file) => {
                await uploadApplicationFile(applicationId, file);
                setFeedback('Arquivo enviado.');
              }}
            />
          </div>
        </Card>
      </div>

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

      <ConfirmDialog
        isOpen={fileToDelete !== null}
        title="Remover arquivo"
        description="O arquivo será removido do armazenamento e da candidatura."
        confirmLabel="Remover arquivo"
        isLoading={isRemovingFile}
        onConfirm={() => void handleRemoveFile()}
        onClose={() => {
          if (isRemovingFile) {
            return;
          }

          setFileToDelete(null);
          setFileError(null);
        }}
      >
        {fileError && (
          <div className="mt-4">
            <Alert
              tone="error"
              title="Não foi possível remover o arquivo"
              description={fileError}
            />
          </div>
        )}
      </ConfirmDialog>

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
