import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApplicationBoard } from '../../services/applications.types';
import { renderWithProviders } from '../../test/render';
import { Board } from './Board';

const place = vi.fn().mockResolvedValue({});

vi.mock('../../services/api/applications.service', () => ({
  applicationsService: {
    place: (...args: unknown[]) => place(...args),
  },
}));

function makeApplication(
  id: string,
  title: string,
  status: ApplicationBoard['columns'][number]['status'],
) {
  return {
    id,
    title,
    link: 'https://example.com/vaga',
    company: 'Acme',
    companyUrl: null,
    position: 1000,
    status,
    currentPhase: 'Triagem',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

function makeBoard(): ApplicationBoard {
  return {
    columns: [
      {
        status: 'PENDING',
        total: 1,
        hasMore: false,
        items: [makeApplication('a', 'Backend Engineer', 'PENDING')],
      },
      { status: 'IN_PROGRESS', total: 0, hasMore: false, items: [] },
      { status: 'COMPLETED', total: 0, hasMore: false, items: [] },
      { status: 'REJECTED', total: 0, hasMore: false, items: [] },
    ],
  };
}

function renderBoard() {
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  renderWithProviders(
    <Board board={makeBoard()} onEdit={onEdit} onDelete={onDelete} />,
  );

  return { onEdit, onDelete };
}

describe('Board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra as colunas e o link para o detalhe', () => {
    renderBoard();

    expect(
      screen.getByRole('heading', { name: 'Aguardando' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Backend Engineer' }),
    ).toHaveAttribute('href', '/candidaturas/a');
  });

  it('dispara edição pelo menu do card', async () => {
    const { onEdit } = renderBoard();

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações de Backend Engineer' }),
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Editar candidatura' }),
    );

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('dispara exclusão pelo menu do card', async () => {
    const { onDelete } = renderBoard();

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações de Backend Engineer' }),
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Excluir candidatura' }),
    );

    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('move o card para outra coluna pelo menu', async () => {
    renderBoard();

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações de Backend Engineer' }),
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Mover para: Em andamento' }),
    );

    await waitFor(() =>
      expect(place).toHaveBeenCalledWith('a', {
        status: 'IN_PROGRESS',
        beforeId: undefined,
        afterId: undefined,
      }),
    );
  });

  it('abre o detalhe com um clique', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/candidaturas"
          element={
            <Board board={makeBoard()} onEdit={vi.fn()} onDelete={vi.fn()} />
          }
        />
        <Route path="/candidaturas/:id" element={<p>detalhe</p>} />
      </Routes>,
      { route: '/candidaturas' },
    );

    await userEvent.click(
      screen.getByRole('link', { name: 'Backend Engineer' }),
    );

    expect(await screen.findByText('detalhe')).toBeInTheDocument();
  });

  it('desativa o arrastar durante a busca', () => {
    renderWithProviders(
      <Board
        board={makeBoard()}
        search="backend"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Reordenação por arrastar desativada/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mover Backend Engineer' }),
    ).not.toBeInTheDocument();
  });
});
