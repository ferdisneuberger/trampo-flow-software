import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Application } from '../../services/applications.types';
import { ApplicationsTable } from './ApplicationsTable';

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
    title: 'Backend Engineer',
    link: 'https://example.com/jobs/backend',
    company: 'Nubank',
    companyUrl: 'https://nubank.com.br',
    position: 1000,
    status: 'IN_PROGRESS',
    currentPhase: 'Teste técnico',
    files: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function renderTable(application = makeApplication()) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  render(
    <MemoryRouter>
      <ApplicationsTable
        applications={[application]}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </MemoryRouter>,
  );

  return { onEdit, onDelete, application };
}

describe('ApplicationsTable', () => {
  it('mostra vaga, empresa, status e fase', () => {
    renderTable();

    expect(
      screen.getByRole('link', { name: 'Backend Engineer' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Nubank').length).toBeGreaterThan(0);
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.getByText('Teste técnico')).toBeInTheDocument();
  });

  it('aponta o título para a página de detalhe', () => {
    renderTable();

    expect(
      screen.getByRole('link', { name: 'Backend Engineer' }),
    ).toHaveAttribute(
      'href',
      '/candidaturas/6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
    );
  });

  it('avisa a edição com a candidatura clicada', async () => {
    const { onEdit, application } = renderTable();

    await userEvent.click(
      screen.getByRole('button', { name: 'Editar Backend Engineer' }),
    );

    expect(onEdit).toHaveBeenCalledWith(application);
  });

  it('avisa a exclusão com a candidatura clicada', async () => {
    const { onDelete, application } = renderTable();

    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir Backend Engineer' }),
    );

    expect(onDelete).toHaveBeenCalledWith(application);
  });
});
