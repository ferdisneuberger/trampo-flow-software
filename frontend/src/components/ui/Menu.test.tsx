import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Menu } from './Menu';

function renderMenu() {
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  render(
    <Menu
      label="Ações de Backend"
      items={[
        { id: 'edit', label: 'Editar', onSelect: onEdit },
        { id: 'delete', label: 'Excluir', tone: 'danger', onSelect: onDelete },
      ]}
    />,
  );

  return { onEdit, onDelete };
}

describe('Menu', () => {
  it('abre e executa a ação selecionada', async () => {
    const { onEdit } = renderMenu();

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações de Backend' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('fecha ao clicar fora', async () => {
    renderMenu();

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações de Backend' }),
    );
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('fecha com Escape e devolve o foco ao gatilho', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Ações de Backend' });

    await userEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
