import axios from 'axios';
import { env } from '../../config/env';
import type { RefreshResponse } from '../auth.types';
import { accessTokenStore } from './access-token';

let refreshInFlight: Promise<RefreshResponse> | null = null;

/**
 * Renova o access token usando o cookie de refresh (httpOnly).
 *
 * A promise é compartilhada para que uma rajada de 401s e a restauração
 * inicial da sessão não disparem múltiplas rotações do refresh token.
 */
export function refreshAccessToken(): Promise<RefreshResponse> {
  refreshInFlight ??= axios
    .post<RefreshResponse>(`${env.apiUrl}/auth/refresh`, null, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
      withCredentials: true,
    })
    .then(({ data }) => {
      accessTokenStore.set(data.accessToken);

      return data;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}
