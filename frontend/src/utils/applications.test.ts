import { describe, expect, it } from 'vitest';
import type { Application } from '../services/applications.types';
import { countApplicationsByStatus } from './applications';

function makeApplication(status: Application['status']): Application {
  return {
    id: crypto.randomUUID(),
    title: 'Vaga',
    link: 'https://example.com',
    status,
    currentPhase: 'Triagem',
    files: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

describe('countApplicationsByStatus', () => {
  it('conta cada status separadamente', () => {
    const counts = countApplicationsByStatus([
      makeApplication('PENDING'),
      makeApplication('PENDING'),
      makeApplication('IN_PROGRESS'),
      makeApplication('COMPLETED'),
      makeApplication('REJECTED'),
    ]);

    expect(counts).toEqual({
      PENDING: 2,
      IN_PROGRESS: 1,
      COMPLETED: 1,
      REJECTED: 1,
    });
  });

  it('devolve zeros para lista vazia', () => {
    expect(countApplicationsByStatus([])).toEqual({
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      REJECTED: 0,
    });
  });

  it('não muta o objeto de contagem entre chamadas', () => {
    countApplicationsByStatus([makeApplication('PENDING')]);

    expect(countApplicationsByStatus([]).PENDING).toBe(0);
  });
});
