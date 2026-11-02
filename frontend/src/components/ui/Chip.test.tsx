import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './Chip';

describe('Chip', () => {
  it('marca o estado ativo para leitores de tela', () => {
    render(<Chip active>Em andamento</Chip>);

    expect(
      screen.getByRole('button', { name: 'Em andamento' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('expõe como não pressionado quando inativo', () => {
    render(<Chip>Todas</Chip>);

    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('dispara o clique', async () => {
    const onClick = vi.fn();

    render(<Chip onClick={onClick}>Filtrar</Chip>);

    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
