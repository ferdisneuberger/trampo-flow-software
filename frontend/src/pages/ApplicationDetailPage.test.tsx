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
  uploadApplicationFile: vi.fn(),
  removeApplicationFile: vi.fn(),
  downloadFile: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock('../hooks/useApplication', () => ({
  useApplication: mocks.useApplication,
}));

vi.mock('../hooks/useApplicationMutations', () => ({
  useApplicationMutations: () => ({
    createApplication: mocks.createApplication,
    updateApplication: mocks.updateApplication,
    deleteApplication: mocks.deleteApplication,
    uploadApplicationFile: mocks.uploadApplicationFile,
    removeApplicationFile: mocks.removeApplicationFile,
  }),
}));

vi.mock('../services/api/applications.service', () => ({
  applicationsService: {
    downloadFile: mocks.downloadFile,
  },
}));

vi.mock('../utils/download', () => ({
  downloadBlob: mocks.downloadBlob,
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
    files: [],
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
    mocks.removeApplicationFile.mockResolvedValue(undefined);
    mocks.downloadFile.mockResolvedValue(new Blob(['conteudo']));
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

  it('mostra os dados da candidatura com links seguros', () => {
    renderPage();

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Acme/ })).toHaveAttribute(
      'href',
      'https://acme.dev/',
    );
    expect(
      screen.getByRole('link', { name: 'https://example.com/vaga' }),
    ).toHaveAttribute('href', 'https://example.com/vaga');
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

  it('baixa um arquivo e trata falha de download', async () => {
    mocks.useApplication.mockReturnValue(
      applicationResult({
        data: makeApplication({
          files: [
            {
              id: 'f1',
              name: 'curriculo.pdf',
              mimeType: 'application/pdf',
              sizeInBytes: 1024,
              uploadedAt: '2026-01-01T00:00:00.000Z',
              url: null,
              downloadUrl: '/applications/a/files/f1/download',
            },
          ],
        }),
      }),
    );

    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: 'Baixar curriculo.pdf' }),
    );

    await waitFor(() =>
      expect(mocks.downloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        'curriculo.pdf',
      ),
    );

    mocks.downloadFile.mockRejectedValue(new Error('Falha no storage.'));

    await userEvent.click(
      screen.getByRole('button', { name: 'Baixar curriculo.pdf' }),
    );

    expect(await screen.findByText('Falha no storage.')).toBeInTheDocument();
  });

  it('mostra erro ao remover arquivo', async () => {
    mocks.useApplication.mockReturnValue(
      applicationResult({
        data: makeApplication({
          files: [
            {
              id: 'f1',
              name: 'curriculo.pdf',
              mimeType: 'application/pdf',
              sizeInBytes: 1024,
              uploadedAt: '2026-01-01T00:00:00.000Z',
              url: null,
              downloadUrl: '/applications/a/files/f1/download',
            },
          ],
        }),
      }),
    );
    mocks.removeApplicationFile.mockRejectedValue(new Error('Falhou.'));

    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remover curriculo.pdf' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remover arquivo' }),
    );

    expect(await screen.findByText('Falhou.')).toBeInTheDocument();
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
