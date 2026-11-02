import { Briefcase, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApplicationForm } from '../components/applications/ApplicationForm';
import { ApplicationsTable } from '../components/applications/ApplicationsTable';
import { Board } from '../components/applications/Board';
import {
  ApplicationStatusTabs,
  type ApplicationStatusFilter,
} from '../components/applications/ApplicationStatusTabs';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { useApplications } from '../hooks/useApplications';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDisclosure } from '../hooks/useDisclosure';
import { useStats } from '../hooks/useStats';
import type {
  Application,
  ApplicationStatus,
  DeleteApplicationMode,
} from '../services/applications.types';
import { getErrorMessage } from '../utils/errors';

const emptyCounts: Record<ApplicationStatus, number> = {
  PENDING: 0,
  IN_PROGRESS: 0,
  COMPLETED: 0,
  REJECTED: 0,
};

function parseStatus(value: string | null): ApplicationStatusFilter {
  if (
    value === 'PENDING' ||
    value === 'IN_PROGRESS' ||
    value === 'COMPLETED' ||
    value === 'REJECTED'
  ) {
    return value;
  }

  return 'ALL';
}

export function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = parseStatus(searchParams.get('status'));
  const view = searchParams.get('view') === 'board' ? 'board' : 'list';
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const {
    applications,
    isLoading,
    isLoadingMore,
    isMutating,
    hasMore,
    error,
    loadMore,
    refresh,
    deleteApplication,
    clearError,
  } = useApplications({
    search: debouncedSearch.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });
  const stats = useStats();
  const statusCounts = stats.data?.byStatus ?? emptyCounts;
  const total = stats.data?.total ?? 0;

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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasFilters =
    debouncedSearch.trim().length > 0 || statusFilter !== 'ALL';

  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        const term = debouncedSearch.trim();

        if (term) {
          next.set('q', term);
        } else {
          next.delete('q');
        }

        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, setSearchParams]);

  const handleStatusChange = useCallback(
    (value: ApplicationStatusFilter) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);

          if (value === 'ALL') {
            next.delete('status');
          } else {
            next.set('status', value);
          }

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

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

  const handleViewChange = useCallback(
    (nextView: 'list' | 'board') => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);

          if (nextView === 'board') {
            next.set('view', 'board');
          } else {
            next.delete('view');
          }

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('q');
        next.delete('status');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidaturas"
        description="Busque, filtre e acompanhe cada processo seletivo."
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Input
          label="Buscar"
          placeholder="Título, empresa ou fase..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          containerClassName="w-full lg:max-w-sm"
        />
        <Tabs
          ariaLabel="Visualização"
          value={view}
          onChange={handleViewChange}
          tabs={[
            { value: 'list', label: 'Lista' },
            { value: 'board', label: 'Quadro' },
          ]}
        />
      </div>

      {view === 'board' ? (
        <Board search={debouncedSearch.trim() || undefined} />
      ) : (
        <>
          <ApplicationStatusTabs
            value={statusFilter}
            counts={statusCounts}
            total={total}
            onChange={handleStatusChange}
          />

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-card border border-line bg-white"
                />
              ))}
            </div>
          ) : total === 0 && !hasFilters ? (
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
          ) : applications.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nenhum resultado encontrado"
              description="Não há candidaturas que correspondam aos filtros atuais. Ajuste a busca ou limpe os filtros."
              action={
                <Button
                  type="button"
                  variant="secondary"
                  onClick={clearFilters}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <ApplicationsTable
                applications={applications}
                onEdit={openEdit}
                onDelete={openDelete}
              />

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-ink-500">
                  Exibindo{' '}
                  <span className="font-semibold text-ink-700">
                    {applications.length}
                  </span>{' '}
                  de {total} {total === 1 ? 'candidatura' : 'candidaturas'}
                </p>
                {hasMore && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void loadMore()}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
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
