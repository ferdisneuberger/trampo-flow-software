import { act, renderHook } from '@testing-library/react';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Application } from '../services/applications.types';
import { useApplicationForm } from './useApplicationForm';

type Options = Parameters<typeof useApplicationForm>[0];
type FormResult = ReturnType<typeof useApplicationForm>;

function setup(overrides: Partial<Options> = {}) {
  const onCreate = vi.fn().mockResolvedValue(undefined);
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  const onAddFiles = vi.fn().mockResolvedValue(undefined);
  const onSuccess = vi.fn();

  const view = renderHook(() =>
    useApplicationForm({
      application: null,
      onCreate,
      onUpdate,
      onAddFiles,
      onSuccess,
      ...overrides,
    }),
  );

  return { ...view, onCreate, onUpdate, onAddFiles, onSuccess };
}

async function submit(form: FormResult): Promise<void> {
  await act(async () => {
    await form.handleSubmit({
      preventDefault: () => undefined,
    } as FormEvent<HTMLFormElement>);
  });
}

function fillValidValues(form: FormResult): void {
  act(() => {
    form.setField('title', 'Backend Engineer');
    form.setField('link', 'https://example.com/jobs/backend');
    form.setField('company', 'Acme');
    form.setField('currentPhase', 'Triagem');
  });
}

const storedApplication: Application = {
  id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
  title: 'Vaga antiga',
  link: 'https://example.com/jobs/antiga',
  company: 'Acme',
  companyUrl: null,
  position: 0,
  status: 'COMPLETED',
  currentPhase: 'Proposta',
  files: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
};

describe('useApplicationForm', () => {
  it('começa vazio com status PENDING', () => {
    const { result } = setup();

    expect(result.current.values).toEqual({
      title: '',
      link: '',
      company: '',
      companyUrl: '',
      currentPhase: '',
      status: 'PENDING',
    });
    expect(result.current.files).toEqual([]);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('bloqueia o envio quando os campos obrigatórios estão vazios', async () => {
    const { result, onCreate, onSuccess } = setup();

    await submit(result.current);

    expect(result.current.errors).toMatchObject({
      title: 'Informe o título da candidatura.',
      link: 'Informe o link da vaga.',
      company: 'Informe a empresa.',
      currentPhase: 'Informe a fase atual.',
    });
    expect(onCreate).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('recusa link que não é http ou https', async () => {
    const { result, onCreate } = setup();

    fillValidValues(result.current);
    act(() => {
      result.current.setField('link', 'ftp://example.com');
    });

    await submit(result.current);

    expect(result.current.errors.link).toBe(
      'Informe uma URL HTTP ou HTTPS válida.',
    );
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('envia o payload normalizado na criação', async () => {
    const { result, onCreate, onSuccess } = setup();

    act(() => {
      result.current.setField('title', '  Backend Engineer  ');
      result.current.setField('link', '  https://example.com/jobs/backend  ');
      result.current.setField('company', '  Acme  ');
      result.current.setField('currentPhase', '  Triagem  ');
    });

    await submit(result.current);

    expect(onCreate).toHaveBeenCalledWith({
      title: 'Backend Engineer',
      link: 'https://example.com/jobs/backend',
      company: 'Acme',
      companyUrl: null,
      currentPhase: 'Triagem',
      status: 'PENDING',
      files: undefined,
    });
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('exige a URL pública do arquivo antes de enviar', async () => {
    const { result, onCreate } = setup();

    fillValidValues(result.current);
    act(() => {
      result.current.addFile();
    });

    const [draft] = result.current.files;

    act(() => {
      result.current.updateFile(draft!.clientId, 'name', 'curriculo.pdf');
    });

    await submit(result.current);

    expect(result.current.errors.files).toBe(
      'Arquivo 1: informe a URL pública do arquivo.',
    );
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('recusa tamanho de arquivo não numérico', async () => {
    const { result } = setup();

    fillValidValues(result.current);
    act(() => {
      result.current.addFile();
    });

    const [draft] = result.current.files;

    act(() => {
      result.current.updateFile(draft!.clientId, 'name', 'curriculo.pdf');
      result.current.updateFile(
        draft!.clientId,
        'url',
        'https://example.com/files/curriculo.pdf',
      );
      result.current.updateFile(draft!.clientId, 'mimeType', 'application/pdf');
      result.current.updateFile(draft!.clientId, 'sizeInBytes', 'abc');
    });

    await submit(result.current);

    expect(result.current.errors.files).toBe(
      'Arquivo 1: informe um tamanho em bytes maior que zero.',
    );
  });

  it('no modo edição atualiza a candidatura e anexa os arquivos novos', async () => {
    const { result, onCreate, onUpdate, onAddFiles } = setup({
      application: storedApplication,
    });

    expect(result.current.values.title).toBe('Vaga antiga');

    act(() => {
      result.current.setField('currentPhase', 'Entrevista final');
      result.current.addFile();
    });

    const [draft] = result.current.files;

    act(() => {
      result.current.updateFile(draft!.clientId, 'name', 'portfolio.pdf');
      result.current.updateFile(
        draft!.clientId,
        'url',
        'https://example.com/files/portfolio.pdf',
      );
      result.current.updateFile(draft!.clientId, 'mimeType', 'APPLICATION/PDF');
      result.current.updateFile(draft!.clientId, 'sizeInBytes', '2048');
    });

    await submit(result.current);

    expect(onUpdate).toHaveBeenCalledWith(storedApplication.id, {
      title: 'Vaga antiga',
      link: 'https://example.com/jobs/antiga',
      company: 'Acme',
      companyUrl: null,
      currentPhase: 'Entrevista final',
      status: 'COMPLETED',
    });
    expect(onAddFiles).toHaveBeenCalledWith(storedApplication.id, [
      {
        name: 'portfolio.pdf',
        url: 'https://example.com/files/portfolio.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 2048,
      },
    ]);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('mostra o erro da API e não chama onSuccess', async () => {
    const { result, onCreate, onSuccess } = setup();

    onCreate.mockRejectedValue(new Error('Falha ao salvar.'));

    fillValidValues(result.current);
    await submit(result.current);

    expect(result.current.errors.form).toBe('Falha ao salvar.');
    expect(result.current.isSubmitting).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('reseta o formulário quando a candidatura em edição muda', () => {
    const { result, rerender } = renderHook(
      (props: { application: Application | null }) =>
        useApplicationForm({
          application: props.application,
          onCreate: vi.fn(),
          onUpdate: vi.fn(),
          onAddFiles: vi.fn(),
          onSuccess: vi.fn(),
        }),
      { initialProps: { application: null as Application | null } },
    );

    act(() => {
      result.current.setField('title', 'Digitado mas não salvo');
    });

    rerender({ application: storedApplication });

    expect(result.current.values.title).toBe('Vaga antiga');
    expect(result.current.files).toEqual([]);
  });

  it('preenche metadados ao escolher arquivo do disco', () => {
    const { result } = setup();
    const file = new File(['conteúdo'], 'curriculo.pdf', {
      type: 'application/pdf',
    });

    act(() => {
      result.current.addFilesFromPicker([file] as unknown as FileList);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0]).toMatchObject({
      name: 'curriculo.pdf',
      mimeType: 'application/pdf',
      sizeInBytes: String(file.size),
      url: '',
      source: 'upload',
    });
  });

  it('infere o MIME type pela extensão quando o navegador não informa', () => {
    const { result } = setup();
    const file = new File(['x'], 'curriculo.docx', { type: '' });

    act(() => {
      result.current.addFilesFromPicker([file] as unknown as FileList);
    });

    expect(result.current.files[0]?.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  it('exige o nome da empresa', async () => {
    const { result, onCreate } = setup();

    act(() => {
      result.current.setField('title', 'Backend Engineer');
      result.current.setField('link', 'https://example.com/jobs/backend');
      result.current.setField('currentPhase', 'Triagem');
    });

    await submit(result.current);

    expect(result.current.errors.company).toBe('Informe a empresa.');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('recusa site da empresa que não é http ou https', async () => {
    const { result, onCreate } = setup();

    fillValidValues(result.current);
    act(() => {
      result.current.setField('companyUrl', 'acme.com');
    });

    await submit(result.current);

    expect(result.current.errors.companyUrl).toBe(
      'Informe uma URL HTTP ou HTTPS válida.',
    );
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('envia null quando o site da empresa está vazio', async () => {
    const { result, onCreate } = setup();

    fillValidValues(result.current);
    act(() => {
      result.current.setField('companyUrl', '   ');
    });

    await submit(result.current);

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ companyUrl: null }),
    );
  });
});
