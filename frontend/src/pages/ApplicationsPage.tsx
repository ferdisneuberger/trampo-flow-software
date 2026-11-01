import { Briefcase, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { ApplicationForm } from '../components/applications/ApplicationForm';
import { ApplicationList } from '../components/applications/ApplicationList';
import { ApplicationListSkeleton } from '../components/applications/ApplicationListSkeleton';
import { ApplicationStats } from '../components/applications/ApplicationStats';
import {
  ApplicationStatusTabs,
  type ApplicationStatusFilter,
} from '../components/applications/ApplicationStatusTabs';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { useApplicationsContext } from '../contexts/ApplicationsContext';
import { useDisclosure } from '../hooks/useDisclosure';
import type {
  Application,
  DeleteApplicationMode,
} from '../services/applications.types';
import { countApplicationsByStatus } from '../utils/applications';
import { getErrorMessage } from '../utils/errors';

export function ApplicationsPage() {
  const {
    applications,
    isLoading,
    isMutating,
    error,
    refresh,
    deleteApplication,
    clearError,
  } = useApplicationsContext();
  const {
    isOpen: isFormOpen,
    open: openFormModal,
    close: closeFormModal,
  } = useDisclosure();
  const {
    isOpen: isDeleteDialogOpen,
    open: openDeleteDialog,
    close: closeDeleteDialogBase,
  } = useDisclosure();
  const [editingApplication, setEditingApplication] =
    useState<Application | null>(null);
  const [deletingApplication, setDeletingApplication] =
    useState<Application | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteApplicationMode>('soft');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<ApplicationStatusFilter>('ALL');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusCounts = useMemo(
    () => countApplicationsByStatus(applications),
    [applications],
  );

  const filteredApplications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus =
        statusFilter === 'ALL' || application.status === statusFilter;
      const matchesTerm =
        term.length === 0 ||
        application.title.toLowerCase().includes(term) ||
        application.currentPhase.toLowerCase().includes(term);

      return matchesStatus && matchesTerm;
    });
  }, [applications, search, statusFilter]);

  const hasFilters = search.trim().length > 0 || statusFilter !== 'ALL';

  const openCreate = useCallback(() => {
    setEditingApplication(null);
    setFeedback(null);
    openFormModal();
  }, [openFormModal]);

  const openEdit = useCallback(
    (application: Application) => {
      setEditingApplication(application);
      setFeedback(null);
      openFormModal();
    },
    [openFormModal],
  );

  const openDelete = useCallback(
    (application: Application) => {
      setDeletingApplication(application);
      setDeleteMode('soft');
      setDeleteError(null);
      setIsDeleteConfirmed(false);
      openDeleteDialog();
    },
    [openDeleteDialog],
  );

  const closeForm = useCallback(() => {
    closeFormModal();
    setEditingApplication(null);
  }, [closeFormModal]);

  const closeDeleteDialog = useCallback(() => {
    if (isDeleting) {
      return;
    }

    closeDeleteDialogBase();
    setDeletingApplication(null);
    setIsDeleteConfirmed(false);
  }, [closeDeleteDialogBase, isDeleting]);

  const handleSaved = useCallback(() => {
    const wasEditing = editingApplication !== null;

    closeForm();
    setFeedback(
      wasEditing
        ? 'Candidatura atualizada com sucesso.'
        : 'Candidatura criada com sucesso.',
    );
  }, [closeForm, editingApplication]);

  const handleDelete = useCallback(async () => {
    if (!deletingApplication || !isDeleteConfirmed) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteApplication(deletingApplication.id, deleteMode);
      closeDeleteDialogBase();
      setDeletingApplication(null);
      setIsDeleteConfirmed(false);
      setFeedback(
        deleteMode === 'hard'
          ? 'Candidatura excluída permanentemente.'
          : 'Candidatura arquivada com sucesso.',
      );
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError));
    } finally {
      setIsDeleting(false);
    }
  }, [
    closeDeleteDialogBase,
    deleteApplication,
    deleteMode,
    deletingApplication,
    isDeleteConfirmed,
  ]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel"
        title="Candidaturas"
        description="Acompanhe cada processo seletivo, mantenha a fase atual em dia e centralize links e documentos."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refresh()}
              disabled={isLoading}
            >
              <RefreshCw
                className={isLoading ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden="true"
              />
              Atualizar
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              Nova candidatura
            </Button>
          </>
        }
      />

      <ApplicationStatusTabs
        value={statusFilter}
        counts={statusCounts}
        total={applications.length}
        onChange={setStatusFilter}
      />

      <ApplicationStats applications={applications} />

      {error && (
        <Alert
          tone="error"
          title="Não foi possível concluir a operação"
          description={error}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                clearError();
                void refresh();
              }}
            >
              Tentar novamente
            </Button>
          }
        />
      )}

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
              aria-label="Fechar aviso"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          }
        />
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Buscar"
            placeholder="Título ou fase atual..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            containerClassName="flex-1"
          />
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              className="self-start sm:self-auto"
            >
              <X className="size-4" aria-hidden="true" />
              Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <ApplicationListSkeleton />
      ) : applications.length === 0 ? (
        error ? null : (
          <EmptyState
            icon={Briefcase}
            title="Comece sua lista de candidaturas"
            description="Cadastre a primeira vaga para acompanhar fases, status e documentos em um único lugar."
            action={
              <Button type="button" onClick={openCreate}>
                <Plus className="size-4" aria-hidden="true" />
                Criar primeira candidatura
              </Button>
            }
          />
        )
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum resultado encontrado"
          description="Não há candidaturas que correspondam aos filtros atuais. Ajuste a busca ou limpe os filtros."
          action={
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-500">
            Exibindo{' '}
            <span className="font-semibold text-ink-700">
              {filteredApplications.length}
            </span>{' '}
            de {applications.length}{' '}
            {applications.length === 1 ? 'candidatura' : 'candidaturas'}
          </p>
          <ApplicationList
            applications={filteredApplications}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={openDelete}
          />
        </div>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingApplication ? 'Editar candidatura' : 'Nova candidatura'}
        description={
          editingApplication
            ? 'Atualize os dados do processo e anexe novos documentos se necessário.'
            : 'Preencha os dados da vaga para começar a acompanhar o processo seletivo.'
        }
        size="lg"
      >
        <ApplicationForm
          key={editingApplication?.id ?? 'new'}
          application={editingApplication}
          onCancel={closeForm}
          onSuccess={handleSaved}
        />
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Excluir candidatura"
        description={
          deletingApplication
            ? deleteMode === 'hard'
              ? `A candidatura "${deletingApplication.title}" será removida permanentemente. Esta ação não pode ser desfeita.`
              : `A candidatura "${deletingApplication.title}" será arquivada e deixará de aparecer na listagem.`
            : ''
        }
        confirmLabel={
          deleteMode === 'hard'
            ? 'Excluir permanentemente'
            : 'Arquivar candidatura'
        }
        isLoading={isDeleting}
        confirmDisabled={!isDeleteConfirmed}
        onConfirm={() => void handleDelete()}
        onClose={closeDeleteDialog}
      >
        {deleteError && (
          <div className="mt-4">
            <Alert
              tone="error"
              title="Não foi possível excluir a candidatura"
              description={deleteError}
            />
          </div>
        )}
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-rose-200 bg-white p-4 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-line accent-rose-600"
            checked={isDeleteConfirmed}
            onChange={(event) => setIsDeleteConfirmed(event.target.checked)}
            disabled={isMutating}
          />
          <span>
            <span className="block font-semibold text-rose-700">
              Confirmo a exclusão
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-ink-500">
              Entendo que a candidatura será removida da listagem e que esta
              ação exige confirmação explícita.
            </span>
          </span>
        </label>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-line text-rose-600 accent-rose-600"
            checked={deleteMode === 'hard'}
            onChange={(event) => {
              setDeleteMode(event.target.checked ? 'hard' : 'soft');
              setIsDeleteConfirmed(false);
            }}
            disabled={isMutating}
          />
          <span>
            <span className="block font-medium text-ink-900">
              Excluir permanentemente
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-ink-500">
              Remove o registro do banco de dados. Sem esta opção, a candidatura
              é apenas arquivada (exclusão lógica).
            </span>
          </span>
        </label>
      </ConfirmDialog>
    </div>
  );
}
