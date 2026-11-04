import { describe, expect, it } from 'vitest';
import {
  getPasswordError,
  getPasswordRequirements,
  isPasswordValid,
} from './password';

function metRequirements(password: string): string[] {
  return getPasswordRequirements(password)
    .filter((requirement) => requirement.met)
    .map((requirement) => requirement.id);
}

describe('password validation', () => {
  it('marca todos os requisitos para uma senha válida', () => {
    expect(metRequirements('Abcdef1!')).toEqual([
      'length',
      'uppercase',
      'number',
      'special',
    ]);
    expect(isPasswordValid('Abcdef1!')).toBe(true);
    expect(getPasswordError('Abcdef1!')).toBeNull();
  });

  it('marca apenas os requisitos atendidos', () => {
    expect(metRequirements('abcdefgh')).toEqual(['length']);
    expect(metRequirements('Abcdefgh')).toEqual(['length', 'uppercase']);
    expect(metRequirements('Abcdefg1')).toEqual([
      'length',
      'uppercase',
      'number',
    ]);
  });

  it('explica qual requisito está faltando', () => {
    expect(getPasswordError('Ab1!')).toBe(
      'A senha deve ter pelo menos 8 caracteres.',
    );
    expect(getPasswordError('abcdefg1!')).toBe(
      'A senha deve conter pelo menos uma letra maiúscula.',
    );
    expect(getPasswordError('Abcdefgh!')).toBe(
      'A senha deve conter pelo menos um número.',
    );
    expect(getPasswordError('Abcdefg1')).toBe(
      'A senha deve conter pelo menos um caractere especial.',
    );
  });

  it('aceita letras acentuadas e símbolos como requisitos', () => {
    expect(isPasswordValid('Ábcdef1@')).toBe(true);
    expect(isPasswordValid('Ábcdefg1')).toBe(false);
  });
});
