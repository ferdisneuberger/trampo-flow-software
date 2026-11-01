import { describe, expect, it } from 'vitest';
import { getHostname } from './url';

describe('getHostname', () => {
  it('remove o prefixo www', () => {
    expect(getHostname('https://www.example.com/vagas/1')).toBe('example.com');
  });

  it('mantém subdomínios', () => {
    expect(getHostname('https://jobs.example.com')).toBe('jobs.example.com');
  });

  it('devolve o valor original quando a URL é inválida', () => {
    expect(getHostname('example.com')).toBe('example.com');
  });
});
