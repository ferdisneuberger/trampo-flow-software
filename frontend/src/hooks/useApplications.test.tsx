import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationsService } from '../services/api/applications.service';
import type { Application } from '../services/applications.types';
import { useApplications } from './useApplications';

vi.mock('../services/api/applications.service', () => ({
  applicationsService: {
    listPage: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    addFiles: vi.fn(),
    remove: vi.fn(),
  },
}));

const listPage = vi.mocked(applicationsService.listPage);
const create = vi.mocked(applicationsService.create);

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
    title: 'Backend Engineer',
    link: 'https://example.com/jobs/backend',
    company: 'Nubank',
    companyUrl: null,
    position: 0,
    status: 'PENDING',
    currentPhase: 'Triagem',
    files: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useApplications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega a primeira página', async () => {
    listPage.mockResolvedValue({
      items: [makeApplication()],
      nextCursor: null,
      hasMore: false,
    });

    const { result } = renderHook(() => useApplications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.applications).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(listPage).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 100,
    });
  });

  it('recarrega a lista depois de criar', async () => {
    listPage
      .mockResolvedValueOnce({
        items: [makeApplication()],
        nextCursor: null,
        hasMore: false,
      })
      .mockResolvedValue({
        items: [makeApplication({ id: 'outro' }), makeApplication()],
        nextCursor: null,
        hasMore: false,
      });
    create.mockResolvedValue(makeApplication({ id: 'outro' }));

    const { result } = renderHook(() => useApplications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createApplication({
        title: 'Backend Engineer',
        link: 'https://example.com/jobs/backend',
        company: 'Nubank',
        currentPhase: 'Triagem',
      });
    });

    await waitFor(() => expect(result.current.applications).toHaveLength(2));
  });

  it('expõe a mensagem de erro da consulta', async () => {
    listPage.mockRejectedValue(new Error('Falha ao carregar.'));

    const { result } = renderHook(() => useApplications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.error).toBe('Falha ao carregar.'),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('permite dispensar o erro', async () => {
    listPage.mockRejectedValue(new Error('Falha ao carregar.'));

    const { result } = renderHook(() => useApplications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
