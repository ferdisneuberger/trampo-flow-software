import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  FileUploader,
  MAX_FILES_PER_APPLICATION,
} from '../components/applications/FileUploader';
import { ApplicationStatusBadge } from '../components/applications/ApplicationStatusBadge';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useApplication } from '../hooks/useApplication';
import { applicationsService } from '../services/api/applications.service';
import { formatDate, formatFileSize } from '../utils/format';
import { getErrorMessage } from '../utils/errors';

export function ApplicationDetailPage() {
  const { id } = useParams();
  const applicationId = id ?? '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useApplication(applicationId);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteHard, setDeleteHard] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ['application', applicationId],
    });
    void queryClient.invalidateQueries({ queryKey: ['applications'] });
    void queryClient.invalidateQueries({ queryKey: ['board'] });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      applicationsService.uploadFile(applicationId, file),
    onSuccess: () => {
      invalidate();
      setFeedback('Arquivo enviado.');
    },
  });

  const removeFileMutation = useMutation({
    mutationFn: (fileId: string) =>
      applicationsService.removeFile(applicationId, fileId),
    onSuccess: () => {
      invalidate();
      setFileToDelete(null);
      setFeedback('Arquivo removido.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      applicationsService.remove(applicationId, deleteHard ? 'hard' : 'soft'),
    onSuccess: () => {
      invalidate();
      navigate('/candidaturas', { replace: true });
    },
    onError: (error) => setDeleteError(getErrorMessage(error)),
  });

  const downloadFile = async (downloadUrl: string, name: string) => {
    const blob = await applicationsService.downloadFile(downloadUrl);
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const application = query.data;

  if (query.isPending) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-64 animate-pulse rounded bg-white" />
        <div className="h-64 animate-pulse rounded-card border border-line bg-white" />
      </div>
    );
  }

  if (query.isError || !application) {
    return (
      <EmptyState
        icon={FileText}
        title="Candidatura não encontrada"
        description="Ela pode ter sido excluída ou pertence a outra conta."
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/candidaturas')}
          >
            Voltar para a lista
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
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
              {application.companyUrl ? (
                <a
                  href={application.companyUrl}
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

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-0">
          <dl className="divide-y divide-line">
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Fase atual
              </dt>
              <dd className="mt-0.5 text-sm text-ink-900">
                {application.currentPhase}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Link da vaga
              </dt>
              <dd className="mt-0.5 truncate text-sm">
                <a
                  href={application.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline"
                >
                  {application.link}
                </a>
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Criada em
              </dt>
              <dd className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-ink-900">
                <CalendarDays
                  className="size-3.5 text-ink-400"
                  aria-hidden="true"
                />
                {formatDate(application.createdAt)}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
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
              {application.files.map((file) => (
                <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-ink-500">
                    <FileText className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-ink-400">
                      {formatFileSize(file.sizeInBytes)} · {file.mimeType}
                    </p>
                  </div>

                  {file.downloadUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        void downloadFile(file.downloadUrl ?? '', file.name)
                      }
                      aria-label={`Baixar ${file.name}`}
                      className="rounded p-2 text-ink-400 hover:bg-surface hover:text-ink-700"
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <a
                      href={file.url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir ${file.name}`}
                      className="rounded p-2 text-ink-400 hover:bg-surface hover:text-ink-700"
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setFileToDelete(file.id)}
                    aria-label={`Remover ${file.name}`}
                    className="rounded p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line p-4">
            <FileUploader
              remaining={MAX_FILES_PER_APPLICATION - application.files.length}
              onUpload={async (file) => {
                await uploadMutation.mutateAsync(file);
              }}
            />
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Editar candidatura"
        description="Atualize os dados do processo e anexe novos documentos se necessário."
        size="lg"
      >
        <ApplicationForm
          key={application.id}
          application={application}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            invalidate();
            setFeedback('Candidatura atualizada com sucesso.');
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={fileToDelete !== null}
        title="Remover arquivo"
        description="O arquivo será removido do armazenamento e da candidatura."
        confirmLabel="Remover arquivo"
        isLoading={removeFileMutation.isPending}
        onConfirm={() => {
          if (fileToDelete) {
            removeFileMutation.mutate(fileToDelete);
          }
        }}
        onClose={() => setFileToDelete(null)}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Excluir candidatura"
        description={
          deleteHard
            ? `A candidatura "${application.title}" será removida permanentemente.`
            : `A candidatura "${application.title}" será arquivada e deixará de aparecer na listagem.`
        }
        confirmLabel={
          deleteHard ? 'Excluir permanentemente' : 'Arquivar candidatura'
        }
        isLoading={deleteMutation.isPending}
        confirmDisabled={!deleteConfirmed}
        onConfirm={() => {
          setDeleteError(null);
          void deleteMutation.mutateAsync();
        }}
        onClose={() => {
          if (deleteMutation.isPending) {
            return;
          }
          setIsDeleteOpen(false);
          setDeleteConfirmed(false);
          setDeleteHard(false);
          setDeleteError(null);
        }}
      >
        {deleteError && (
          <div className="mt-4">
            <Alert
              tone="error"
              title="Não foi possível excluir"
              description={deleteError}
            />
          </div>
        )}
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-rose-200 bg-white p-4 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-line accent-rose-600"
            checked={deleteConfirmed}
            onChange={(event) => setDeleteConfirmed(event.target.checked)}
          />
          <span>
            <span className="block font-semibold text-rose-700">
              Confirmo a exclusão
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-ink-500">
              Entendo que a candidatura será removida da listagem.
            </span>
          </span>
        </label>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-line accent-rose-600"
            checked={deleteHard}
            onChange={(event) => {
              setDeleteHard(event.target.checked);
              setDeleteConfirmed(false);
            }}
          />
          <span>
            <span className="block font-medium text-ink-900">
              Excluir permanentemente
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-ink-500">
              Remove o registro do banco. Sem esta opção, a candidatura é apenas
              arquivada.
            </span>
          </span>
        </label>
      </ConfirmDialog>
    </div>
  );
}
