import { describe, expect, it } from 'vitest';
import { isHttpUrl } from './validation';

describe('isHttpUrl', () => {
  it('aceita http e https', () => {
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('https://example.com/vaga?x=1')).toBe(true);
  });

  it('recusa outros protocolos', () => {
    expect(isHttpUrl('ftp://example.com')).toBe(false);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
  });

  it('recusa texto que não é URL', () => {
    expect(isHttpUrl('example.com')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });

  it('recusa URL sem host', () => {
    expect(isHttpUrl('https://')).toBe(false);
  });
});
