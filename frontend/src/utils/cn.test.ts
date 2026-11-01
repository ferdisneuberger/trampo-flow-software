import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('junta as classes truthy com espaço', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('ignora false, null e undefined', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('devolve string vazia quando não há classes', () => {
    expect(cn()).toBe('');
    expect(cn(false, undefined)).toBe('');
  });
});
