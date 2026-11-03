import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Application } from '../services/applications.types';
import { renderWithProviders } from '../test/render';
import { ApplicationDetailPage } from './ApplicationDetailPage';

const mocks = vi.hoisted(() => ({
  useApplication: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
}));

vi.mock('../hooks/useApplication', () => ({
  useApplication: mocks.useApplication,
}));

vi.mock('../hooks/useApplicationMutations', () => ({
  useApplicationMutations: () => ({
    createApplication: mocks.createApplication,
    updateApplication: mocks.updateApplication,
    deleteApplication: mocks.deleteApplication,
  }),
}));

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'a',
    title: 'Backend Engineer',
    link: 'https://example.com/vaga',
    company: 'Acme',
    companyUrl: 'https://acme.dev',
    position: 1000,
    status: 'PENDING',
    currentPhase: 'Triagem',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function applicationResult(overrides: Record<string, unknown> = {}) {
  return {
    data: makeApplication(),
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<
    typeof import('../hooks/useApplication').useApplication
  >;
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/candidaturas/:id" element={<ApplicationDetailPage />} />
      <Route path="/candidaturas" element={<p>quadro</p>} />
    </Routes>,
    { route: '/candidaturas/a' },
  );
}

describe('ApplicationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useApplication.mockReturnValue(applicationResult());
    mocks.updateApplication.mockResolvedValue(makeApplication());
    mocks.deleteApplication.mockResolvedValue(undefined);
  });

  it('mostra skeleton no carregamento', () => {
    mocks.useApplication.mockReturnValue(
      applicationResult({ data: undefined, isPending: true }),
    );

    renderPage();

    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
  });

  it('mostra erro com retry quando a consulta falha', async () => {
    const refetch = vi.fn();

    mocks.useApplication.mockReturnValue(
      applicationResult({
        data: undefined,
        isError: true,
        error: new Error('Falha ao carregar.'),
        refetch,
      }),
    );

    renderPage();

    expect(
      screen.getByText('Não foi possível carregar a candidatura'),
    ).toBeInTheDocument();
    expect(screen.getByText('Falha ao carregar.')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    );
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('mostra todos os dados cadastrados com links seguros', () => {
    renderPage();

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
    expect(screen.queryByText('Empresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.getByText('Fase atual')).toBeInTheDocument();
    expect(screen.getByText('Triagem')).toBeInTheDocument();
    expect(screen.getByText('Aguardando')).toBeInTheDocument();
    expect(screen.getByText('Site da empresa')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /acme\.dev/ })).toHaveAttribute(
      'href',
      'https://acme.dev/',
    );
    expect(screen.getByText('Link da vaga')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /example\.com/ })).toHaveAttribute(
      'href',
      'https://example.com/vaga',
    );
  });

  it('oculta o site da empresa quando não informado', () => {
    mocks.useApplication.mockReturnValue(
      applicationResult({
        data: makeApplication({ companyUrl: null }),
      }),
    );

    renderPage();

    expect(screen.queryByText('Site da empresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Não informado')).not.toBeInTheDocument();
    expect(screen.getByText('Link da vaga')).toBeInTheDocument();
  });

  it('não cria link para URL com esquema perigoso', () => {
    mocks.useApplication.mockReturnValue(
      applicationResult({
        data: makeApplication({
          link: 'javascript:alert(1)',
          companyUrl: 'javascript:alert(2)',
        }),
      }),
    );

    renderPage();

    expect(screen.queryByRole('link', { name: /Acme/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /javascript/ })).toBeNull();
  });

  it('exclui a candidatura e volta para o quadro', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await userEvent.click(
      screen.getByRole('checkbox', { name: /Confirmo a exclusão/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Arquivar candidatura' }),
    );

    await waitFor(() =>
      expect(mocks.deleteApplication).toHaveBeenCalledWith('a', 'soft'),
    );
    expect(await screen.findByText('quadro')).toBeInTheDocument();
  });

  it('edita a candidatura', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const phase = screen.getByLabelText('Fase atual');
    await userEvent.clear(phase);
    await userEvent.type(phase, 'Proposta');
    await userEvent.click(
      screen.getByRole('button', { name: /Salvar alterações/ }),
    );

    await waitFor(() =>
      expect(mocks.updateApplication).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ currentPhase: 'Proposta' }),
      ),
    );
  });
});
