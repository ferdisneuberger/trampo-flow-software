import { describe, expect, it } from 'vitest';
import { formatDate, formatFileSize } from './format';

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

describe('formatFileSize', () => {
  it('mantém bytes abaixo de 1 KB', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('converte para KB com uma casa decimal', () => {
    expect(formatFileSize(1536)).toBe('1,5 KB');
  });

  it('converte para MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
  });

  it('converte para GB', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('devolve travessão para valores inválidos', () => {
    expect(formatFileSize(-1)).toBe('—');
    expect(formatFileSize(Number.NaN)).toBe('—');
  });
});
