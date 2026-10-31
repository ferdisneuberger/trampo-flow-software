import axios from 'axios';

type ApiErrorPayload = {
  error?: string;
  message?: string | string[];
  statusCode?: number;
};

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    if (!error.response) {
      return new ApiError(
        'Não foi possível conectar à API. Verifique se o backend está em execução.',
        undefined,
        'NETWORK_ERROR',
      );
    }

    const payload = error.response.data;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(' ')
      : payload?.message;

    return new ApiError(
      message ?? 'Não foi possível concluir a solicitação.',
      error.response.status,
      payload?.error,
      payload,
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('Ocorreu um erro inesperado. Tente novamente.');
}
