import { describe, expect, it } from 'vitest';
import { ApiError } from '../services/api/errors';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('usa a mensagem da ApiError', () => {
    expect(getErrorMessage(new ApiError('Link inválido.'))).toBe(
      'Link inválido.',
    );
  });

  it('usa a mensagem de qualquer Error', () => {
    expect(getErrorMessage(new Error('Falhou.'))).toBe('Falhou.');
  });

  it('devolve mensagem padrão para valores desconhecidos', () => {
    expect(getErrorMessage('string solta')).toBe(
      'Ocorreu um erro inesperado. Tente novamente.',
    );
    expect(getErrorMessage(null)).toBe(
      'Ocorreu um erro inesperado. Tente novamente.',
    );
  });
});
