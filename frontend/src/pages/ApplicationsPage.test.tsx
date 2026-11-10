import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Application,
  ApplicationBoard,
} from '../services/applications.types';
import { renderWithProviders } from '../test/render';
import { ApplicationsPage } from './ApplicationsPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useBoard: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
}));

vi.mock('../hooks/useBoard', () => ({
  useBoard: mocks.useBoard,
}));

vi.mock('../contexts/auth-context', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('../hooks/useApplicationMutations', () => ({
  useApplicationMutations: () => ({
    createApplication: mocks.createApplication,
    updateApplication: mocks.updateApplication,
    deleteApplication: mocks.deleteApplication,
  }),
}));

vi.mock('../components/applications/Board', () => ({
  Board: ({
    board,
    onEdit,
    onDelete,
  }: {
    board: ApplicationBoard;
    onEdit: (application: Application) => void;
    onDelete: (application: Application) => void;
  }) => (
    <div>
      {board.columns.flatMap((column) =>
        column.items.map((application) => (
          <div key={application.id}>
            <span>{application.title}</span>
            <button type="button" onClick={() => onEdit(application)}>
              Editar {application.title}
            </button>
            <button type="button" onClick={() => onDelete(application)}>
              Excluir {application.title}
            </button>
          </div>
        )),
      )}
    </div>
  ),
}));

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'a',
    title: 'Backend Engineer',
    link: 'https://example.com/vaga',
    company: 'Acme',
    companyUrl: null,
    position: 1000,
    status: 'PENDING',
    currentPhase: 'Triagem',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeBoard(items: Application[] = []): ApplicationBoard {
  return {
    columns: [
      {
        status: 'PENDING',
        total: items.length,
        hasMore: false,
        items,
      },
      { status: 'IN_PROGRESS', total: 0, hasMore: false, items: [] },
      { status: 'COMPLETED', total: 0, hasMore: false, items: [] },
      { status: 'REJECTED', total: 0, hasMore: false, items: [] },
    ],
  };
}

function boardResult(overrides: Record<string, unknown> = {}) {
  return {
    data: makeBoard(),
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof import('../hooks/useBoard').useBoard>;
}

function makeAuthUser(verified = true) {
  return {
    user: {
      id: 'user-1',
      email: 'pessoa@example.com',
      firstName: 'Fernando',
      lastName: 'Neuberger',
      emailVerified: verified,
      hasPassword: true,
      termsAccepted: true,
      themePreference: 'light',
      verificationResendAvailableAt: null,
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
    updateThemePreference: vi.fn(),
  };
}

function renderPage(route = '/candidaturas') {
  return renderWithProviders(<ApplicationsPage />, { route });
}

describe('ApplicationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createApplication.mockResolvedValue(makeApplication());
    mocks.updateApplication.mockResolvedValue(makeApplication());
    mocks.deleteApplication.mockResolvedValue(undefined);
    mocks.useBoard.mockReturnValue(boardResult());
    mocks.useAuth.mockReturnValue(makeAuthUser());
  });

  it('desabilita a criação quando o e-mail não foi verificado', () => {
    mocks.useAuth.mockReturnValue(makeAuthUser(false));

    renderPage();

    expect(
      screen.getByRole('button', { name: /Nova candidatura/ }),
    ).toBeDisabled();
  });

  it('mostra skeleton no carregamento inicial', () => {
    mocks.useBoard.mockReturnValue(
      boardResult({ data: undefined, isPending: true }),
    );

    renderPage();

    expect(
      screen.getByRole('status', { name: 'Carregando quadro' }),
    ).toBeInTheDocument();
  });

  it('mostra erro com ação de retry e não mostra empty state', async () => {
    const refetch = vi.fn();

    mocks.useBoard.mockReturnValue(
      boardResult({ data: undefined, isError: true, refetch }),
    );

    renderPage();

    expect(
      screen.getByText('Não foi possível carregar o quadro'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Comece seu quadro de candidaturas'),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    );
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('mostra o convite quando o quadro está vazio', () => {
    renderPage();

    expect(
      screen.getByText('Comece seu quadro de candidaturas'),
    ).toBeInTheDocument();
  });

  it('mostra o quadro e cria uma candidatura', async () => {
    mocks.useBoard.mockReturnValue(
      boardResult({ data: makeBoard([makeApplication()]) }),
    );

    renderPage();

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /Nova candidatura/ }),
    );
    await userEvent.type(
      screen.getByLabelText('Título da candidatura'),
      'Frontend Engineer',
    );
    await userEvent.type(screen.getByLabelText('Empresa'), 'Acme');
    await userEvent.type(
      screen.getByLabelText('Link da vaga'),
      'https://example.com/front',
    );
    await userEvent.clear(screen.getByLabelText('Fase atual'));
    await userEvent.type(screen.getByLabelText('Fase atual'), 'Triagem');
    await userEvent.click(
      screen.getByRole('button', { name: /Criar candidatura/ }),
    );

    await waitFor(() =>
      expect(mocks.createApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Frontend Engineer',
          company: 'Acme',
          currentPhase: 'Triagem',
        }),
      ),
    );
    expect(
      await screen.findByText('Candidatura criada com sucesso.'),
    ).toBeInTheDocument();
  });

  it('edita uma candidatura existente', async () => {
    mocks.useBoard.mockReturnValue(
      boardResult({ data: makeBoard([makeApplication()]) }),
    );

    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: 'Editar Backend Engineer' }),
    );

    const phase = screen.getByLabelText('Fase atual');
    await userEvent.clear(phase);
    await userEvent.type(phase, 'Entrevista');
    await userEvent.click(
      screen.getByRole('button', { name: /Salvar alterações/ }),
    );

    await waitFor(() =>
      expect(mocks.updateApplication).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ currentPhase: 'Entrevista' }),
      ),
    );
  });

  it('arquiva a candidatura após confirmação explícita', async () => {
    mocks.useBoard.mockReturnValue(
      boardResult({ data: makeBoard([makeApplication()]) }),
    );

    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir Backend Engineer' }),
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: /Confirmo a exclusão/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Arquivar candidatura' }),
    );

    await waitFor(() =>
      expect(mocks.deleteApplication).toHaveBeenCalledWith('a', 'soft'),
    );
    expect(
      await screen.findByText('Candidatura arquivada com sucesso.'),
    ).toBeInTheDocument();
  });

  it('inicializa a busca a partir da URL', () => {
    renderPage('/candidaturas?q=nubank');

    expect(mocks.useBoard).toHaveBeenCalledWith('nubank');
    expect(screen.getByLabelText('Buscar')).toHaveValue('nubank');
  });
});
