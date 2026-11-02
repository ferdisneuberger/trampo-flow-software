import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs';

const tabs = [
  { value: 'recent', label: 'Recentes', count: 3 },
  { value: 'stale', label: 'Paradas' },
] as const;

describe('Tabs', () => {
  it('marca apenas a aba selecionada', () => {
    render(
      <Tabs tabs={tabs} value="recent" onChange={vi.fn()} ariaLabel="Visão" />,
    );

    expect(screen.getByRole('tab', { name: /Recentes/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Paradas' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('mostra a contagem quando informada', () => {
    render(
      <Tabs tabs={tabs} value="recent" onChange={vi.fn()} ariaLabel="Visão" />,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('avisa a troca de aba', async () => {
    const onChange = vi.fn();

    render(
      <Tabs tabs={tabs} value="recent" onChange={onChange} ariaLabel="Visão" />,
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Paradas' }));

    expect(onChange).toHaveBeenCalledWith('stale');
  });
});
