import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationsService } from '../services/api/applications.service';
import { useApplication } from './useApplication';

vi.mock('../services/api/applications.service', () => ({
  applicationsService: { getById: vi.fn() },
}));

const getById = vi.mocked(applicationsService.getById);

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

describe('useApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca a candidatura pelo id', async () => {
    getById.mockResolvedValue({
      id: 'abc',
      title: 'Backend',
      link: 'https://example.com',
      company: 'Acme',
      companyUrl: null,
      position: 1000,
      status: 'PENDING',
      currentPhase: 'Triagem',
      files: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    });

    const { result } = renderHook(() => useApplication('abc'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getById).toHaveBeenCalledWith('abc');
    expect(result.current.data?.title).toBe('Backend');
  });

  it('não busca quando o id está vazio', () => {
    renderHook(() => useApplication(''), { wrapper: createWrapper() });

    expect(getById).not.toHaveBeenCalled();
  });
});
