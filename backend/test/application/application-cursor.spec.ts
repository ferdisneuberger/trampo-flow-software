import { describe, expect, it } from 'vitest';
import {
  decodeCursorPayload,
  encodeCursor,
} from '../../src/application/applications/types/application-cursor';
import { ApplicationError } from '../../src/application/shared/errors/application.error';

const cursor = {
  sort: 'recent' as const,
  value: new Date('2026-01-01T00:00:00.000Z'),
  id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
};

function payload(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('application cursor', () => {
  it('faz round-trip do cursor', () => {
    const encoded = encodeCursor(cursor);

    expect(decodeCursorPayload(encoded, 'recent')).toEqual(cursor);
  });

  it('recusa cursor emitido para outra ordenação', () => {
    const encoded = encodeCursor(cursor);

    expect(() => decodeCursorPayload(encoded, 'stale')).toThrow(
      ApplicationError,
    );
  });

  it('recusa base64 inválido', () => {
    expect(() => decodeCursorPayload('nao-e-um-cursor', 'recent')).toThrow(
      ApplicationError,
    );
  });

  it('recusa payload sem os campos obrigatórios', () => {
    expect(() =>
      decodeCursorPayload(payload({ s: 'recent' }), 'recent'),
    ).toThrow(ApplicationError);
  });

  it('recusa data inválida', () => {
    const encoded = payload({ s: 'recent', v: 'ontem', i: 'abc' });

    expect(() => decodeCursorPayload(encoded, 'recent')).toThrow(
      ApplicationError,
    );
  });

  it('recusa JSON que não é objeto', () => {
    expect(() => decodeCursorPayload(payload('texto'), 'recent')).toThrow(
      ApplicationError,
    );
  });
});
