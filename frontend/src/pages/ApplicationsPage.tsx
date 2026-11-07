import { Briefcase, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../contexts/auth-context';
import { useApplicationMutations } from '../hooks/useApplicationMutations';
import { useBoard } from '../hooks/useBoard';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDisclosure } from '../hooks/useDisclosure';
import type {
  Application,
  DeleteApplicationMode,
} from '../services/applications.types';
import { cn } from '../utils/cn';

const emptySteps = [
  {
    number: '01',
    title: 'Cria a candidatura',
    description: 'Cola o link da vaga, a empresa e a fase atual.',
  },
  {
    number: '02',
    title: 'Move pelo funil',
    description: 'Arrasta o card conforme a conversa avança.',
  },
  {
    number: '03',
    title: 'Fecha o ciclo',
    description: 'Registra a proposta ou o feedback e segue pro próximo.',
  },
];

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
  const { user } = useAuth();
  const canCreate = user?.emailVerified ?? false;
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
  const [isSearchOpen, setIsSearchOpen] = useState(() =>
    Boolean(searchParams.get('q') || searchParams.get('focus') === 'search'),
  );
  const shouldFocusSearchRef = useRef(false);

  const openSearch = useCallback(() => {
    if (isSearchOpen) {
      const input = document.getElementById('board-search');

      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }

      return;
    }

    shouldFocusSearchRef.current = true;
    setIsSearchOpen(true);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen || !shouldFocusSearchRef.current) {
      return;
    }

    const input = document.getElementById('board-search');

    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }

    shouldFocusSearchRef.current = false;
  }, [isSearchOpen]);

  useEffect(() => {
    const handleFocusSearch = () => openSearch();

    window.addEventListener('trampo-flow:focus-search', handleFocusSearch);

    return () =>
      window.removeEventListener('trampo-flow:focus-search', handleFocusSearch);
  }, [openSearch]);

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

  useEffect(() => {
    if (searchParams.get('focus') !== 'search') {
      return;
    }

    const input = document.getElementById('board-search');

    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('focus');

        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

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
  const inProgress =
    board.data?.columns.find((column) => column.status === 'IN_PROGRESS')
      ?.total ?? 0;
  const hasItems =
    board.data?.columns.some((column) => column.items.length > 0) ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        eyebrow="Quadro"
        title="Meus trampos"
        meta={
          <>
            {total} candidaturas
            <span className="mx-2 text-ink-900/30">·</span>
            <strong className="text-ink-900">{inProgress} em andamento</strong>
          </>
        }
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void board.refetch()}
              disabled={board.isFetching}
              aria-label="Atualizar quadro"
            >
              <RefreshCw
                className={board.isFetching ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={openSearch}
              aria-expanded={isSearchOpen}
              aria-controls="board-search-panel"
            >
              <Search className="size-4" aria-hidden="true" />
              Filtros
            </Button>
            <Button
              type="button"
              onClick={openCreate}
              disabled={!canCreate}
              title={
                canCreate
                  ? undefined
                  : 'Confirme seu e-mail para criar candidaturas.'
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              Nova candidatura
            </Button>
          </>
        }
      />

      <div id="board-search-panel" className={cn(!isSearchOpen && 'hidden')}>
        <Input
          id="board-search"
          label="Buscar"
          hideLabel
          placeholder="Título, empresa ou fase..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          leading={<Search className="size-4" aria-hidden="true" />}
          trailing={
            <kbd className="mr-1 hidden rounded border border-ink-900 bg-yellow px-1.5 py-0.5 font-mono text-[10px] font-bold text-on-accent sm:inline">
              /
            </kbd>
          }
          containerClassName="w-full max-w-2xl"
        />
      </div>

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

      <div className="flex min-h-0 flex-1 flex-col">
        {board.isPending && !board.data ? (
          <BoardSkeleton />
        ) : board.isError && !board.data ? null : total === 0 && !search ? (
          <Card className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid size-16 place-items-center rounded-xl border-2 border-ink-900 bg-yellow text-on-accent shadow-hard-sm">
              <Briefcase className="size-8" aria-hidden="true" />
            </span>
            <p className="mt-5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-coral-dark">
              Primeiro passo
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
              Comece seu quadro de candidaturas
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
              A primeira vaga é o começo. Cadastra a primeira candidatura e
              acompanha cada fase em um só lugar. O quadro se organiza sozinho
              conforme você avança.
            </p>
            <Button
              type="button"
              onClick={openCreate}
              disabled={!canCreate}
              className="mt-6"
            >
              <Plus className="size-4" aria-hidden="true" />
              Criar primeira candidatura
            </Button>
            <p className="mt-3 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-ink-500">
              Leva menos de um minuto · sem planilha
            </p>

            <div className="mt-8 grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3">
              {emptySteps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-xl border-2 border-ink-900 bg-surface p-4 shadow-hard-sm"
                >
                  <span className="font-mono text-[10px] font-bold text-coral-dark">
                    {step.number}
                  </span>
                  <h3 className="mt-2 font-display text-base font-bold tracking-[-0.02em] text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-ink-500">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : !hasItems ? (
          <EmptyState
            icon={Search}
            title="Nada por aqui com esses filtros"
            description="Não há candidaturas que correspondam à busca atual. Tenta limpar ou mudar a busca."
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
      </div>

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
