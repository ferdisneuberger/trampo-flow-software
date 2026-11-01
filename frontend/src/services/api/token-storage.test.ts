import { describe, expect, it } from 'vitest';
import { AUTH_UNAUTHORIZED_EVENT, tokenStorage } from './token-storage';

describe('tokenStorage', () => {
  it('começa vazio', () => {
    expect(tokenStorage.get()).toBeNull();
  });

  it('guarda e devolve o token', () => {
    tokenStorage.set('abc.def.ghi');

    expect(tokenStorage.get()).toBe('abc.def.ghi');
  });

  it('limpa o token', () => {
    tokenStorage.set('abc.def.ghi');
    tokenStorage.clear();

    expect(tokenStorage.get()).toBeNull();
  });

  it('usa uma chave própria e expõe o evento de não autorizado', () => {
    tokenStorage.set('abc.def.ghi');

    expect(window.localStorage.getItem('trampo-flow.token')).toBe(
      'abc.def.ghi',
    );
    expect(AUTH_UNAUTHORIZED_EVENT).toBe('trampo-flow:unauthorized');
  });
});
