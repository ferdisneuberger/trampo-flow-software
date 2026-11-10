import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import type { JobPostingPreview } from '../../services/applications.types';
import { JobLinkPrefill } from './JobLinkPrefill';

const mocks = vi.hoisted(() => ({ preview: vi.fn() }));

vi.mock('../../services/api/applications.service', () => ({
  applicationsService: { preview: mocks.preview },
}));

const LINK = 'https://acme.gupy.io/jobs/123';

function found(overrides: Partial<JobPostingPreview> = {}): JobPostingPreview {
  return {
    title: 'Backend Engineer',
    company: 'Acme',
    companyUrl: 'https://acme.com',
    status: 'found',
    ...overrides,
  };
}

function setup(filled: string[] = ['title', 'company', 'link']) {
  const onPrefill = vi.fn().mockReturnValue(filled);

  render(<JobLinkPrefill onPrefill={onPrefill} />);

  return {
    onPrefill,
    input: screen.getByLabelText('Link para preencher automaticamente'),
    button: screen.getByRole('button', { name: /Preencher/ }),
  };
}

describe('JobLinkPrefill', () => {
  beforeEach(() => {
    mocks.preview.mockReset();
  });

  it('busca os dados e repassa as sugestões com o link', async () => {
    mocks.preview.mockResolvedValue(found());
    const { input, button, onPrefill } = setup();

    await userEvent.type(input, LINK);
    await userEvent.click(button);

    expect(mocks.preview).toHaveBeenCalledWith(LINK, {
      signal: expect.any(AbortSignal),
    });
    expect(onPrefill).toHaveBeenCalledWith({
      link: LINK,
      title: 'Backend Engineer',
      company: 'Acme',
      companyUrl: 'https://acme.com',
    });
    expect(
      await screen.findByText(
        'Preenchemos título e empresa. Confira abaixo e complete o que faltar.',
      ),
    ).toBeInTheDocument();
  });

  it('busca ao colar um link válido', async () => {
    mocks.preview.mockResolvedValue(found());
    const { input } = setup();

    await act(async () => {
      fireEvent.paste(input, {
        clipboardData: { getData: () => `  ${LINK}  ` },
      });
    });

    expect(mocks.preview).toHaveBeenCalledWith(LINK, expect.anything());
    expect(input).toHaveValue(LINK);
  });

  it('não busca link inválido e explica o motivo', async () => {
    const { input, button } = setup();

    await userEvent.type(input, 'acme.com/vaga');
    await userEvent.click(button);

    expect(mocks.preview).not.toHaveBeenCalled();
    expect(
      screen.getByText('Cole um link HTTP ou HTTPS válido.'),
    ).toBeInTheDocument();
  });

  it('avisa quando os campos já estavam preenchidos', async () => {
    mocks.preview.mockResolvedValue(found());
    const { input, button } = setup(['link']);

    await userEvent.type(input, LINK);
    await userEvent.click(button);

    expect(
      await screen.findByText(
        'Os campos já estavam preenchidos, então não alteramos nada.',
      ),
    ).toBeInTheDocument();
  });

  it('cai no preenchimento manual quando a página não pode ser lida', async () => {
    mocks.preview.mockResolvedValue(
      found({
        title: null,
        company: null,
        companyUrl: null,
        status: 'blocked',
      }),
    );
    const { input, button, onPrefill } = setup(['link']);

    await userEvent.type(input, LINK);
    await userEvent.click(button);

    expect(onPrefill).toHaveBeenCalledWith(
      expect.objectContaining({ link: LINK, title: null }),
    );
    expect(
      await screen.findByText(
        'Não conseguimos ler os dados dessa página. Preencha os campos abaixo.',
      ),
    ).toBeInTheDocument();
  });

  it('mostra o erro do servidor e ainda aproveita o link', async () => {
    mocks.preview.mockRejectedValue(
      new ApiError('Muitas tentativas. Tente novamente em 30 segundos.', 429),
    );
    const { input, button, onPrefill } = setup(['link']);

    await userEvent.type(input, LINK);
    await userEvent.click(button);

    expect(onPrefill).toHaveBeenCalledWith({ link: LINK });
    expect(
      await screen.findByText(/Muitas tentativas.*Preencha os campos abaixo\./),
    ).toBeInTheDocument();
  });
});
