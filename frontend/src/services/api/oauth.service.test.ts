import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import { oauthService } from './oauth.service';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('oauthService', () => {
  describe('isEnabled', () => {
    it('é verdadeiro quando a metadata do servidor existe', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ issuer: 'https://x.example' }),
        }),
      );

      await expect(oauthService.isEnabled()).resolves.toBe(true);
    });

    it.each([
      ['404 (flag desligada)', { ok: false, json: async () => ({}) }],
      ['HTML do SPA no lugar do JSON', { ok: true, json: async () => ({}) }],
    ])('é falso com %s', async (_label, response) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

      await expect(oauthService.isEnabled()).resolves.toBe(false);
    });

    it('é falso quando a rede falha', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede')));

      await expect(oauthService.isEnabled()).resolves.toBe(false);
    });
  });

  it('preview envia os parâmetros na query', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: {} });

    await oauthService.preview({ client_id: 'a', state: 'b' });

    expect(get).toHaveBeenCalledWith('/oauth/authorize/preview', {
      params: { client_id: 'a', state: 'b' },
    });
  });

  it('decide envia os parâmetros mais approve', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { redirectTo: 'https://x' } });

    await expect(
      oauthService.decide({ client_id: 'a' }, true),
    ).resolves.toEqual({ redirectTo: 'https://x' });
    expect(post).toHaveBeenCalledWith('/oauth/authorize/decision', {
      client_id: 'a',
      approve: true,
    });
  });

  it('lista e revoga aplicativos conectados', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({});

    await oauthService.listGrants();
    await oauthService.revokeGrant('g1');

    expect(get).toHaveBeenCalledWith('/oauth/grants');
    expect(del).toHaveBeenCalledWith('/oauth/grants/g1');
  });
});
