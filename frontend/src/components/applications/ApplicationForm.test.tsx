import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Application } from '../../services/applications.types';
import { ApplicationForm } from './ApplicationForm';

const mocks = vi.hoisted(() => ({ preview: vi.fn() }));

vi.mock('../../services/api/applications.service', () => ({
  applicationsService: { preview: mocks.preview },
}));

const application: Application = {
  id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
  title: 'Vaga antiga',
  link: 'https://example.com/jobs/antiga',
  company: 'Acme',
  companyUrl: null,
  position: 1000,
  status: 'PENDING',
  currentPhase: 'Triagem',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
};

function renderForm(current: Application | null = null) {
  render(
    <ApplicationForm
      application={current}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onCancel={vi.fn()}
      onSuccess={vi.fn()}
    />,
  );
}

describe('ApplicationForm', () => {
  it('ao criar, oferece o preenchimento pelo link acima do formulário', () => {
    renderForm();

    expect(screen.getByText('Preencher pelo link da vaga')).toBeInTheDocument();
    expect(screen.getByText('ou preencha')).toBeInTheDocument();
    expect(screen.getByLabelText('Fase atual')).toHaveValue(
      'Candidatura enviada',
    );
  });

  it('ao editar, mostra só o formulário', () => {
    renderForm(application);

    expect(
      screen.queryByText('Preencher pelo link da vaga'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Fase atual')).toHaveValue('Triagem');
  });

  it('preenche os campos vazios com o que foi encontrado no link', async () => {
    mocks.preview.mockResolvedValue({
      title: 'Backend Engineer',
      company: 'Acme',
      companyUrl: 'https://acme.com',
      status: 'found',
    });
    renderForm();

    await userEvent.type(screen.getByLabelText('Empresa'), 'Já digitada');
    await userEvent.type(
      screen.getByLabelText('Link para preencher automaticamente'),
      'https://acme.gupy.io/jobs/1',
    );
    await userEvent.click(screen.getByRole('button', { name: /Preencher/ }));

    expect(
      await screen.findByDisplayValue('Backend Engineer'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Empresa')).toHaveValue('Já digitada');
    expect(screen.getByLabelText('Site da empresa')).toHaveValue(
      'https://acme.com',
    );
    expect(screen.getByLabelText('Link da vaga')).toHaveValue(
      'https://acme.gupy.io/jobs/1',
    );
  });
});
