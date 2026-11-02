import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileUploader, MAX_FILE_SIZE_BYTES } from './FileUploader';

function makeFile(name: string, size = 4): File {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' });
}

describe('FileUploader', () => {
  it('envia um PDF válido', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const file = makeFile('curriculo.pdf');

    render(<FileUploader onUpload={onUpload} remaining={3} />);

    await userEvent.upload(screen.getByLabelText('Escolher arquivo'), file);

    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('recusa extensão não permitida', async () => {
    const onUpload = vi.fn();

    render(<FileUploader onUpload={onUpload} remaining={3} />);

    await userEvent.upload(
      screen.getByLabelText('Escolher arquivo'),
      makeFile('video.mp4'),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Envie apenas arquivos PDF ou TXT.',
    );
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('recusa arquivo acima de 5 MB', async () => {
    const onUpload = vi.fn();

    render(<FileUploader onUpload={onUpload} remaining={3} />);

    await userEvent.upload(
      screen.getByLabelText('Escolher arquivo'),
      makeFile('grande.pdf', MAX_FILE_SIZE_BYTES + 1),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O arquivo deve ter no máximo 5 MB.',
    );
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('não permite enviar quando o limite de arquivos foi atingido', async () => {
    const onUpload = vi.fn();

    render(<FileUploader onUpload={onUpload} remaining={0} />);

    expect(screen.getByLabelText('Escolher arquivo')).toBeDisabled();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('mostra o erro devolvido pelo upload', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('Falha no storage.'));

    render(<FileUploader onUpload={onUpload} remaining={3} />);

    await userEvent.upload(
      screen.getByLabelText('Escolher arquivo'),
      makeFile('curriculo.pdf'),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha no storage.',
    );
  });
});
