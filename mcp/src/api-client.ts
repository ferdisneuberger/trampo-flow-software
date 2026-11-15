import type {
  Application,
  ApplicationStats,
  Board,
  JobPostingPreview,
  PaginatedApplications,
} from './types.js';

type FetchLike = typeof fetch;

export type ApiClientOptions = {
  apiUrl: string;
  token: string;
  timeoutMs: number;
  fetch?: FetchLike;
};

type RequestOptions = {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
};

const TOKEN_HELP =
  'Gere outro em Configurações → Tokens de integração e atualize TRAMPO_API_TOKEN.';

/** Erro já traduzido em uma mensagem útil para o modelo. Nunca contém o token. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ErrorPayload = {
  error?: string;
  message?: string | string[];
  retryAfterSeconds?: number;
};

function readMessage(payload: ErrorPayload | null): string | undefined {
  if (!payload?.message) {
    return undefined;
  }

  return Array.isArray(payload.message)
    ? payload.message.join(' ')
    : payload.message;
}

export function toApiError(
  status: number,
  payload: ErrorPayload | null,
): ApiError {
  const apiMessage = readMessage(payload);
  const code = payload?.error;

  switch (status) {
    case 400:
      return new ApiError(
        `Dados recusados pela API: ${apiMessage ?? 'requisição inválida.'}`,
        status,
        code,
      );
    case 401:
      return new ApiError(
        `Token de integração inválido, expirado ou revogado. ${TOKEN_HELP}`,
        status,
        code,
      );
    case 403:
      return new ApiError(
        apiMessage ?? 'Acesso negado para tokens de integração.',
        status,
        code,
      );
    case 404:
      // A API responde em inglês ("Application ... was not found"); o modelo
      // precisa de uma mensagem acionável.
      return new ApiError(
        'Candidatura não encontrada. Confira o id com list_applications.',
        status,
        code,
      );
    case 429: {
      const seconds = payload?.retryAfterSeconds;
      const wait = seconds ? `${seconds} segundos` : '1 minuto';

      return new ApiError(
        `Muitas requisições em pouco tempo. Tente de novo em ${wait}.`,
        status,
        code,
      );
    }
    default:
      if (status >= 500) {
        return new ApiError(
          `A API do Trampo Flow falhou (HTTP ${status}). Tente de novo em instantes.`,
          status,
          code,
        );
      }

      return new ApiError(
        apiMessage ?? `A API respondeu HTTP ${status}.`,
        status,
        code,
      );
  }
}

export class TrampoApiClient {
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: ApiClientOptions) {
    this.fetchImpl = options.fetch ?? fetch;
  }

  /** Valida o token: `GET /auth/me` aceita PAT e responde 401 se ele for inválido. */
  getMe(): Promise<{ id: string; email: string }> {
    return this.request('GET', '/auth/me');
  }

  previewJobPosting(link: string): Promise<JobPostingPreview> {
    return this.request('POST', '/applications/preview', { body: { link } });
  }

  listApplications(query: {
    status?: string;
    search?: string;
    limit?: number;
    sort?: 'recent' | 'stale';
    cursor?: string;
  }): Promise<PaginatedApplications> {
    return this.request('GET', '/applications', { query });
  }

  getBoard(query: {
    limitPerColumn?: number;
    search?: string;
  }): Promise<Board> {
    return this.request('GET', '/applications/board', { query });
  }

  getStats(): Promise<ApplicationStats> {
    return this.request('GET', '/applications/stats');
  }

  getApplication(id: string): Promise<Application> {
    return this.request('GET', `/applications/${encodeURIComponent(id)}`);
  }

  createApplication(body: {
    title: string;
    link: string;
    company: string;
    companyUrl?: string;
    currentPhase: string;
    status?: string;
  }): Promise<Application> {
    return this.request('POST', '/applications', { body });
  }

  updateApplication(
    id: string,
    body: Record<string, unknown>,
  ): Promise<Application> {
    return this.request('PATCH', `/applications/${encodeURIComponent(id)}`, {
      body,
    });
  }

  placeApplication(
    id: string,
    body: { status?: string; beforeId?: string; afterId?: string },
  ): Promise<Application> {
    return this.request(
      'PATCH',
      `/applications/${encodeURIComponent(id)}/placement`,
      { body },
    );
  }

  private async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${this.options.apiUrl}${path}`);

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.options.token}`,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;

    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        throw new ApiError(
          `A API do Trampo Flow não respondeu em ${Math.round(this.options.timeoutMs / 1000)} segundos.`,
          undefined,
          'TIMEOUT',
        );
      }

      throw new ApiError(
        `Não foi possível conectar à API em ${this.options.apiUrl}. Confira TRAMPO_API_URL e se o servidor está no ar.`,
        undefined,
        'NETWORK_ERROR',
      );
    }

    const text = await response.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw toApiError(response.status, payload as ErrorPayload | null);
    }

    return payload as T;
  }
}
