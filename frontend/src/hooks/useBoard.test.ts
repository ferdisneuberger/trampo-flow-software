import { describe, expect, it } from 'vitest';
import type { ApplicationBoard } from '../services/applications.types';
import { applyPlacement } from './useBoard';

function makeBoard(): ApplicationBoard {
  const base = {
    link: 'https://example.com',
    company: 'Acme',
    companyUrl: null,
    currentPhase: 'Triagem',
    files: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };

  return {
    columns: [
      {
        status: 'PENDING',
        total: 2,
        hasMore: false,
        items: [
          { ...base, id: 'a', title: 'A', status: 'PENDING', position: 1000 },
          { ...base, id: 'b', title: 'B', status: 'PENDING', position: 2000 },
        ],
      },
      {
        status: 'IN_PROGRESS',
        total: 2,
        hasMore: false,
        items: [
          {
            ...base,
            id: 'c',
            title: 'C',
            status: 'IN_PROGRESS',
            position: 1000,
          },
          {
            ...base,
            id: 'd',
            title: 'D',
            status: 'IN_PROGRESS',
            position: 2000,
          },
        ],
      },
      { status: 'COMPLETED', total: 0, hasMore: false, items: [] },
      { status: 'REJECTED', total: 0, hasMore: false, items: [] },
    ],
  };
}

describe('applyPlacement', () => {
  it('reordena dentro da mesma coluna', () => {
    const board = applyPlacement(makeBoard(), {
      id: 'b',
      status: 'PENDING',
      beforeId: 'a',
    });

    const pending = board.columns.find((column) => column.status === 'PENDING');

    expect(pending?.items.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('move para outra coluna na posição informada', () => {
    const board = applyPlacement(makeBoard(), {
      id: 'a',
      status: 'IN_PROGRESS',
      beforeId: 'c',
    });

    const pending = board.columns.find((column) => column.status === 'PENDING');
    const progress = board.columns.find(
      (column) => column.status === 'IN_PROGRESS',
    );

    expect(pending?.items.map((item) => item.id)).toEqual(['b']);
    expect(progress?.items.map((item) => item.id)).toEqual(['c', 'a', 'd']);
    expect(progress?.items[1]?.status).toBe('IN_PROGRESS');
  });

  it('move para o fim quando não há vizinhos', () => {
    const board = applyPlacement(makeBoard(), {
      id: 'a',
      status: 'COMPLETED',
    });

    const completed = board.columns.find(
      (column) => column.status === 'COMPLETED',
    );

    expect(completed?.items.map((item) => item.id)).toEqual(['a']);
  });

  it('devolve o quadro intacto quando o card não existe', () => {
    const original = makeBoard();
    const board = applyPlacement(original, {
      id: 'inexistente',
      status: 'COMPLETED',
    });

    expect(board).toBe(original);
  });
});
