import { describe, expect, it } from 'vitest';
import {
  formatVerificationCode,
  isVerificationCodeComplete,
} from './verification-code';

describe('formatVerificationCode', () => {
  it('insere o hífen após os três primeiros caracteres', () => {
    expect(formatVerificationCode('A', '')).toBe('A');
    expect(formatVerificationCode('AB', 'A')).toBe('AB');
    expect(formatVerificationCode('ABC', 'AB')).toBe('ABC-');
    expect(formatVerificationCode('ABC1', 'ABC-')).toBe('ABC-1');
    expect(formatVerificationCode('ABC123', 'ABC-12')).toBe('ABC-123');
  });

  it('normaliza letras minúsculas, espaços e hífens extras', () => {
    expect(formatVerificationCode(' adk7yp ')).toBe('ADK-7YP');
    expect(formatVerificationCode('adk-7yp')).toBe('ADK-7YP');
    expect(formatVerificationCode('ADK--7YP')).toBe('ADK-7YP');
  });

  it('permite apagar o hífen', () => {
    expect(formatVerificationCode('ABC', 'ABC-')).toBe('ABC');
  });

  it('limita o código a seis caracteres', () => {
    expect(formatVerificationCode('ABC1234')).toBe('ABC-123');
  });
});

describe('isVerificationCodeComplete', () => {
  it('aceita apenas o formato completo', () => {
    expect(isVerificationCodeComplete('ABC-123')).toBe(true);
    expect(isVerificationCodeComplete('ABC-')).toBe(false);
    expect(isVerificationCodeComplete('ABC123')).toBe(false);
  });
});
