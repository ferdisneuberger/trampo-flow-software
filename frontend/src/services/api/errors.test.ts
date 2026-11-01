import { describe, expect, it } from 'vitest';
import { ApiError, normalizeApiError } from './errors';

function axiosError(response: { status: number; data: unknown } | undefined) {
  return { isAxiosError: true, response };
}

describe('normalizeApiError', () => {
  it('devolve a própria ApiError sem recriar', () => {
    const error = new ApiError('Já normalizado.');

    expect(normalizeApiError(error)).toBe(error);
  });

  it('usa a mensagem do backend e preserva status e código', () => {
    const error = normalizeApiError(
      axiosError({
        status: 409,
        data: { error: 'CONFLICT', message: 'Já existe.' },
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Já existe.');
    expect(error.status).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  it('junta mensagens quando o backend devolve lista', () => {
    const error = normalizeApiError(
      axiosError({
        status: 400,
        data: {
          error: 'VALIDATION',
          message: ['Título obrigatório.', 'Link inválido.'],
        },
      }),
    );

    expect(error.message).toBe('Título obrigatório. Link inválido.');
  });

  it('usa mensagem padrão quando o corpo não traz message', () => {
    const error = normalizeApiError(axiosError({ status: 500, data: {} }));

    expect(error.message).toBe('Não foi possível concluir a solicitação.');
  });

  it('identifica erro de rede quando não há resposta', () => {
    const error = normalizeApiError(axiosError(undefined));

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toContain('Não foi possível conectar à API');
  });

  it('converte Error comum', () => {
    expect(normalizeApiError(new Error('Falhou.')).message).toBe('Falhou.');
  });

  it('converte valor desconhecido em mensagem padrão', () => {
    expect(normalizeApiError({ qualquer: 'coisa' }).message).toBe(
      'Ocorreu um erro inesperado. Tente novamente.',
    );
  });
});
