import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('lê URL e token e remove a barra final', () => {
    expect(
      loadConfig({
        TRAMPO_API_URL: 'https://x.dev/api/',
        TRAMPO_API_TOKEN: 'tfp_abc',
      }),
    ).toEqual({
      apiUrl: 'https://x.dev/api',
      token: 'tfp_abc',
      timeoutMs: 15000,
    });
  });

  it('aceita timeout configurável', () => {
    expect(
      loadConfig({
        TRAMPO_API_URL: 'http://localhost/api',
        TRAMPO_API_TOKEN: 'tfp_a',
        TRAMPO_API_TIMEOUT_MS: '3000',
      }).timeoutMs,
    ).toBe(3000);
  });

  it('falha cedo sem variáveis', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({})).toThrow(/TRAMPO_API_URL/);
  });

  it('recusa token que não é de integração, sem ecoar o valor', () => {
    let message = '';

    try {
      loadConfig({
        TRAMPO_API_URL: 'https://x.dev/api',
        TRAMPO_API_TOKEN: 'eyJhbGciOi.jwt.segredo',
      });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(/tfp_/);
    expect(message).not.toContain('eyJhbGciOi.jwt.segredo');
  });

  it('recusa URL inválida', () => {
    expect(() =>
      loadConfig({ TRAMPO_API_URL: 'nao-e-url', TRAMPO_API_TOKEN: 'tfp_a' }),
    ).toThrow(ConfigError);
  });
});
