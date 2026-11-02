import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

function Harness({
  onClose = vi.fn(),
  closeOnEscape = true,
}: {
  onClose?: () => void;
  closeOnEscape?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Abrir
      </button>
      <Modal
        isOpen={isOpen}
        title="Título"
        description="Descrição"
        closeOnEscape={closeOnEscape}
        onClose={() => {
          onClose();
          setIsOpen(false);
        }}
      >
        <button type="button">Confirmar</button>
      </Modal>
    </div>
  );
}

describe('Modal', () => {
  it('foca o primeiro elemento e trava o scroll do body', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Fechar modal' }),
      ).toHaveFocus(),
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('mantém o foco dentro do diálogo ao tabular', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    const last = screen.getByRole('button', { name: 'Confirmar' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(screen.getByRole('button', { name: 'Fechar modal' })).toHaveFocus();
  });

  it('fecha com Escape e devolve o foco ao gatilho', async () => {
    const onClose = vi.fn();

    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(trigger);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.overflow).toBe('');
  });

  it('não fecha com Escape quando desabilitado', async () => {
    const onClose = vi.fn();

    render(<Harness onClose={onClose} closeOnEscape={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
