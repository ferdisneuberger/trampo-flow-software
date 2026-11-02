import { Briefcase, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApplicationForm } from '../components/applications/ApplicationForm';
import { Board } from '../components/applications/Board';
import {
  BOARD_GRID_CLASSES,
  BOARD_SCROLL_CLASSES,
} from '../components/applications/board-layout';
import { DeleteApplicationDialog } from '../components/applications/DeleteApplicationDialog';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { useApplicationMutations } from '../hooks/useApplicationMutations';
import { useBoard } from '../hooks/useBoard';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDisclosure } from '../hooks/useDisclosure';
import type {
  Application,
  DeleteApplicationMode,
} from '../services/applications.types';

function BoardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando quadro"
      className={BOARD_SCROLL_CLASSES}
    >
      <div className={BOARD_GRID_CLASSES}>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-72 rounded-card" />
        ))}
      </div>
    </div>
  );
}

export function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const search = debouncedSearch.trim();
  const board = useBoard(search || undefined);
  const { createApplication, updateApplication } = useApplicationMutations();

  const {
    isOpen: isFormOpen,
    open: openFormModal,
    close: closeFormModal,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    open: openDeleteDialog,
    close: closeDeleteDialog,
  } = useDisclosure();

  const [editingApplication, setEditingApplication] =
    useState<Application | null>(null);
  const [deletingApplication, setDeletingApplication] =
    useState<Application | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);

        if (search) {
          next.set('q', search);
        } else {
          next.delete('q');
        }

        return next;
      },
      { replace: true },
    );
  }, [search, setSearchParams]);

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
      setFeedback(null);
      openDeleteDialog();
    },
    [openDeleteDialog],
  );

  const closeForm = useCallback(() => {
    closeFormModal();
    setEditingApplication(null);
  }, [closeFormModal]);

  const closeDelete = useCallback(() => {
    closeDeleteDialog();
    setDeletingApplication(null);
  }, [closeDeleteDialog]);

  const handleSaved = useCallback(() => {
    const wasEditing = editingApplication !== null;

    closeForm();
    setFeedback(
      wasEditing
        ? 'Candidatura atualizada com sucesso.'
        : 'Candidatura criada com sucesso.',
    );
  }, [closeForm, editingApplication]);

  const handleDeleted = useCallback((mode: DeleteApplicationMode) => {
    setFeedback(
      mode === 'hard'
        ? 'Candidatura excluída permanentemente.'
        : 'Candidatura arquivada com sucesso.',
    );
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('q');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const total =
    board.data?.columns.reduce((sum, column) => sum + column.total, 0) ?? 0;
  const hasItems =
    board.data?.columns.some((column) => column.items.length > 0) ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidaturas"
        description="Arraste os cards para acompanhar cada processo seletivo pelo funil."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void board.refetch()}
              disabled={board.isFetching}
            >
              <RefreshCw
                className={board.isFetching ? 'size-4 animate-spin' : 'size-4'}
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

      {board.isError && (
        <Alert
          tone="error"
          title="Não foi possível carregar o quadro"
          description="Verifique a conexão e tente novamente."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void board.refetch()}
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

      <Input
        label="Buscar"
        placeholder="Título, empresa ou fase..."
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        containerClassName="w-full lg:max-w-sm"
      />

      {board.isPending && !board.data ? (
        <BoardSkeleton />
      ) : board.isError && !board.data ? null : total === 0 && !search ? (
        <EmptyState
          icon={Briefcase}
          title="Comece seu quadro de candidaturas"
          description="Cadastre a primeira vaga para acompanhar fases, status e documentos em um único lugar."
          action={
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              Criar primeira candidatura
            </Button>
          }
        />
      ) : !hasItems ? (
        <EmptyState
          icon={Search}
          title="Nenhum resultado encontrado"
          description="Não há candidaturas que correspondam à busca atual. Ajuste o termo ou limpe a busca."
          action={
            <Button type="button" variant="secondary" onClick={clearSearch}>
              Limpar busca
            </Button>
          }
        />
      ) : board.data ? (
        <Board
          board={board.data}
          search={search || undefined}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      ) : null}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingApplication ? 'Editar candidatura' : 'Nova candidatura'}
        description={
          editingApplication
            ? 'Atualize os dados do processo seletivo.'
            : 'Preencha os dados da vaga para começar a acompanhar o processo seletivo.'
        }
        size="lg"
      >
        <ApplicationForm
          key={editingApplication?.id ?? 'new'}
          application={editingApplication}
          onCreate={createApplication}
          onUpdate={updateApplication}
          onCancel={closeForm}
          onSuccess={handleSaved}
        />
      </Modal>

      <DeleteApplicationDialog
        key={`${deletingApplication?.id ?? 'none'}-${isDeleteOpen}`}
        application={deletingApplication}
        isOpen={isDeleteOpen}
        onClose={closeDelete}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
