import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import { applicationsService } from './applications.service';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const client = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('applicationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca o quadro com busca opcional', async () => {
    client.get.mockResolvedValue({ data: { columns: [] } });

    await expect(
      applicationsService.board({ search: 'acme' }),
    ).resolves.toEqual({ columns: [] });
    expect(client.get).toHaveBeenCalledWith('/applications/board', {
      params: { search: 'acme' },
    });
  });

  it('move uma candidatura', async () => {
    client.patch.mockResolvedValue({ data: { id: 'a' } });

    await applicationsService.place('a', {
      status: 'IN_PROGRESS',
      beforeId: 'b',
    });

    expect(client.patch).toHaveBeenCalledWith('/applications/a/placement', {
      status: 'IN_PROGRESS',
      beforeId: 'b',
    });
  });

  it('busca por id', async () => {
    client.get.mockResolvedValue({ data: { id: 'a' } });

    await applicationsService.getById('a');

    expect(client.get).toHaveBeenCalledWith('/applications/a');
  });

  it('cria e atualiza', async () => {
    client.post.mockResolvedValue({ data: { id: 'a' } });
    client.patch.mockResolvedValue({ data: { id: 'a' } });

    await applicationsService.create({
      title: 'Backend',
      link: 'https://example.com',
      company: 'Acme',
      currentPhase: 'Triagem',
    });
    await applicationsService.update('a', { currentPhase: 'Proposta' });

    expect(client.post).toHaveBeenCalledWith('/applications', {
      title: 'Backend',
      link: 'https://example.com',
      company: 'Acme',
      currentPhase: 'Triagem',
    });
    expect(client.patch).toHaveBeenCalledWith('/applications/a', {
      currentPhase: 'Proposta',
    });
  });

  it('remove com modo soft por padrão', async () => {
    client.delete.mockResolvedValue({});

    await applicationsService.remove('a');
    await applicationsService.remove('a', 'hard');

    expect(client.delete).toHaveBeenNthCalledWith(1, '/applications/a', {
      params: { mode: 'soft' },
    });
    expect(client.delete).toHaveBeenNthCalledWith(2, '/applications/a', {
      params: { mode: 'hard' },
    });
  });
});
