import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationsService } from '../services/api/applications.service';
import type { Application } from '../services/applications.types';
import { useApplicationMutations } from './useApplicationMutations';

vi.mock('../services/api/applications.service', () => ({
  applicationsService: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const create = vi.mocked(applicationsService.create);
const update = vi.mocked(applicationsService.update);
const remove = vi.mocked(applicationsService.remove);

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

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  const view = renderHook(() => useApplicationMutations(), {
    wrapper: Wrapper,
  });

  return { ...view, invalidate };
}

describe('useApplicationMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue(makeApplication());
    update.mockResolvedValue(makeApplication());
    remove.mockResolvedValue(undefined);
  });

  it('cria e invalida quadro e detalhe', async () => {
    const { result, invalidate } = setup();

    await act(async () => {
      await result.current.createApplication({
        title: 'Backend Engineer',
        link: 'https://example.com/vaga',
        company: 'Acme',
        currentPhase: 'Triagem',
      });
    });

    expect(create).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['board'] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['application', 'a'],
    });
  });

  it('atualiza e invalida o detalhe', async () => {
    const { result, invalidate } = setup();

    await act(async () => {
      await result.current.updateApplication('a', { currentPhase: 'Proposta' });
    });

    expect(update).toHaveBeenCalledWith('a', { currentPhase: 'Proposta' });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['application', 'a'],
    });
  });

  it('remove e invalida o detalhe', async () => {
    const { result, invalidate } = setup();

    await act(async () => {
      await result.current.deleteApplication('a', 'hard');
    });

    expect(remove).toHaveBeenCalledWith('a', 'hard');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['application', 'a'],
    });
  });
});
