import { describe, expect, it } from 'vitest';
import { normalizeVerificationCode } from '../../src/application/auth/services/verification-code';

describe('normalizeVerificationCode', () => {
  it('normaliza maiúsculas, espaços e ausência de hífen', () => {
    expect(normalizeVerificationCode(' adk-7yp ')).toBe('ADK-7YP');
    expect(normalizeVerificationCode('adk7yp')).toBe('ADK-7YP');
    expect(normalizeVerificationCode('ADK 7YP')).toBe('ADK-7YP');
  });

  it('recusa formatos inválidos', () => {
    expect(normalizeVerificationCode('')).toBeNull();
    expect(normalizeVerificationCode('ABC')).toBeNull();
    expect(normalizeVerificationCode('ABC-12')).toBeNull();
    expect(normalizeVerificationCode('ABC_123')).toBeNull();
  });
});
