import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationsService } from '../services/api/applications.service';
import type { Application } from '../services/applications.types';
import { DashboardPage } from './DashboardPage';

vi.mock('../services/api/applications.service', () => ({
  applicationsService: {
    stats: vi.fn(),
    listPage: vi.fn(),
  },
}));

const stats = vi.mocked(applicationsService.stats);
const listPage = vi.mocked(applicationsService.listPage);

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
    title: 'Backend Engineer',
    link: 'https://example.com/jobs/backend',
    company: 'Nubank',
    companyUrl: null,
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

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(<DashboardPage />, { wrapper: Wrapper });
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra os contadores do servidor', async () => {
    stats.mockResolvedValue({
      total: 7,
      byStatus: { PENDING: 2, IN_PROGRESS: 3, COMPLETED: 1, REJECTED: 1 },
    });
    listPage.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });

    renderDashboard();

    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('lista as candidaturas paradas com os dias', async () => {
    stats.mockResolvedValue({
      total: 1,
      byStatus: { PENDING: 1, IN_PROGRESS: 0, COMPLETED: 0, REJECTED: 0 },
    });
    listPage.mockImplementation(async (params) => ({
      items: [
        makeApplication({
          title: params?.sort === 'stale' ? 'Parada' : 'Recente',
        }),
      ],
      nextCursor: null,
      hasMore: false,
    }));

    renderDashboard();

    expect(await screen.findByText('Parada')).toBeInTheDocument();
    expect(screen.getByText('Recente')).toBeInTheDocument();
    expect(screen.getByText(/dias/)).toBeInTheDocument();
  });

  it('mostra convite quando não há candidaturas', async () => {
    stats.mockResolvedValue({
      total: 0,
      byStatus: { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, REJECTED: 0 },
    });
    listPage.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });

    renderDashboard();

    expect(await screen.findByText('Nada por aqui ainda')).toBeInTheDocument();
  });
});
