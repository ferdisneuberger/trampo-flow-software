import { describe, expect, it } from 'vitest';
import { safeHttpUrl, safeRedirectPath } from './url';

describe('safeHttpUrl', () => {
  it('aceita http e https', () => {
    expect(safeHttpUrl('https://example.com/vaga')).toBe(
      'https://example.com/vaga',
    );
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com/');
  });

  it('rejeita esquemas perigosos e valores inválidos', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,oi')).toBeNull();
    expect(safeHttpUrl('ftp://example.com')).toBeNull();
    expect(safeHttpUrl('nao-e-url')).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});

describe('safeRedirectPath', () => {
  it('aceita caminhos internos', () => {
    expect(safeRedirectPath('/candidaturas')).toBe('/candidaturas');
    expect(safeRedirectPath('/candidaturas/123?x=1')).toBe(
      '/candidaturas/123?x=1',
    );
  });

  it('rejeita destinos externos e entradas inválidas', () => {
    expect(safeRedirectPath('https://evil.example.com')).toBeNull();
    expect(safeRedirectPath('//evil.example.com')).toBeNull();
    expect(safeRedirectPath('/\\evil.example.com')).toBeNull();
    expect(safeRedirectPath('/candidaturas\n')).toBeNull();
    expect(safeRedirectPath(42)).toBeNull();
    expect(safeRedirectPath(null)).toBeNull();
  });
});
