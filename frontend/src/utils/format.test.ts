import { describe, expect, it } from 'vitest';
import { formatDate } from './format';

describe('formatDate', () => {
  it('formata uma data ISO em pt-BR', () => {
    const formatted = formatDate('2026-01-15T12:00:00.000Z');

    expect(formatted).toContain('2026');
    expect(formatted).toMatch(/jan/i);
  });

  it('devolve travessão para data inválida', () => {
    expect(formatDate('não é data')).toBe('—');
  });
});
