import { describe, expect, it } from 'vitest';
import { accessTokenStore, AUTH_UNAUTHORIZED_EVENT } from './access-token';

describe('accessTokenStore', () => {
  it('começa vazio', () => {
    expect(accessTokenStore.get()).toBeNull();
  });

  it('guarda e devolve o token em memória', () => {
    accessTokenStore.set('abc.def.ghi');

    expect(accessTokenStore.get()).toBe('abc.def.ghi');
    expect(window.localStorage.getItem('trampo-flow.token')).toBeNull();
  });

  it('limpa o token', () => {
    accessTokenStore.set('abc.def.ghi');
    accessTokenStore.clear();

    expect(accessTokenStore.get()).toBeNull();
  });

  it('expõe o evento de sessão encerrada', () => {
    expect(AUTH_UNAUTHORIZED_EVENT).toBe('trampo-flow:unauthorized');
  });
});
