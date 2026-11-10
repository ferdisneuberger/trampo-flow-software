import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  const onCancel = vi.fn();

  render(
    <ApplicationForm
      application={current}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onCancel={onCancel}
      onSuccess={vi.fn()}
    />,
  );

  return { onCancel };
}

const LINK_LABEL = 'Link para preencher automaticamente';

describe('ApplicationForm', () => {
  beforeEach(() => {
    mocks.preview.mockReset();
  });

  it('ao criar, começa só com o link e esconde o formulário', async () => {
    const { onCancel } = renderForm();

    expect(screen.getByText('Preencher pelo link da vaga')).toBeInTheDocument();
    expect(screen.getByLabelText(LINK_LABEL)).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Título da candidatura'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Criar candidatura/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Cancelar/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('mostra o formulário vazio ao escolher preencher à mão', async () => {
    renderForm();

    await userEvent.click(
      screen.getByRole('button', { name: /Preencher à mão/ }),
    );

    expect(screen.getByLabelText('Título da candidatura')).toHaveValue('');
    expect(screen.getByLabelText('Título da candidatura')).toHaveFocus();
    expect(screen.getByLabelText('Fase atual')).toHaveValue(
      'Candidatura enviada',
    );
    expect(screen.getByLabelText(LINK_LABEL)).toBeInTheDocument();
  });

  it('ao editar, mostra só o formulário', () => {
    renderForm(application);

    expect(
      screen.queryByText('Preencher pelo link da vaga'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Fase atual')).toHaveValue('Triagem');
  });

  it('depois da busca mostra o formulário preenchido e foca o primeiro campo vazio', async () => {
    mocks.preview.mockResolvedValue({
      title: 'Backend Engineer',
      company: null,
      companyUrl: 'https://acme.com',
      status: 'found',
    });
    renderForm();

    await userEvent.type(
      screen.getByLabelText(LINK_LABEL),
      'https://acme.gupy.io/jobs/1',
    );
    await userEvent.click(screen.getByRole('button', { name: /^Preencher$/ }));

    expect(
      await screen.findByDisplayValue('Backend Engineer'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Site da empresa')).toHaveValue(
      'https://acme.com',
    );
    expect(screen.getByLabelText('Link da vaga')).toHaveValue(
      'https://acme.gupy.io/jobs/1',
    );
    expect(screen.getByLabelText('Empresa')).toHaveFocus();
    expect(screen.getByText('acme.gupy.io/jobs/1')).toBeInTheDocument();
  });

  it('não sobrescreve o que já foi digitado à mão', async () => {
    mocks.preview.mockResolvedValue({
      title: 'Backend Engineer',
      company: 'Acme',
      companyUrl: null,
      status: 'found',
    });
    renderForm();

    await userEvent.click(
      screen.getByRole('button', { name: /Preencher à mão/ }),
    );
    await userEvent.type(screen.getByLabelText('Empresa'), 'Já digitada');
    await userEvent.type(
      screen.getByLabelText(LINK_LABEL),
      'https://acme.gupy.io/jobs/1',
    );
    await userEvent.click(screen.getByRole('button', { name: /^Preencher$/ }));

    expect(
      await screen.findByDisplayValue('Backend Engineer'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Empresa')).toHaveValue('Já digitada');
  });
});
