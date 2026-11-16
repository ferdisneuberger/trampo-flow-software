import type {
  AuthorizationPreview,
  ConnectedApp,
  OAuthAuthorizeParams,
} from '../oauth.types';
import { apiClient } from './client';

export const oauthService = {
  /**
   * O OAuth fica atrás de uma flag no servidor: a metadata só existe (200) quando
   * ela está ligada. Qualquer falha conta como desligado.
   */
  async isEnabled(): Promise<boolean> {
    try {
      const response = await fetch('/.well-known/oauth-authorization-server', {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return false;
      }

      const body = (await response.json()) as { issuer?: unknown };

      return typeof body.issuer === 'string';
    } catch {
      return false;
    }
  },

  async preview(params: OAuthAuthorizeParams): Promise<AuthorizationPreview> {
    const { data } = await apiClient.get<AuthorizationPreview>(
      '/oauth/authorize/preview',
      { params },
    );

    return data;
  },

  /** O servidor revalida tudo e devolve a URL de retorno (com `code` ou `error`). */
  async decide(
    params: OAuthAuthorizeParams,
    approve: boolean,
  ): Promise<{ redirectTo: string }> {
    const { data } = await apiClient.post<{ redirectTo: string }>(
      '/oauth/authorize/decision',
      { ...params, approve },
    );

    return data;
  },

  async listGrants(): Promise<ConnectedApp[]> {
    const { data } = await apiClient.get<ConnectedApp[]>('/oauth/grants');

    return data;
  },

  async revokeGrant(id: string): Promise<void> {
    await apiClient.delete(`/oauth/grants/${id}`);
  },
};
