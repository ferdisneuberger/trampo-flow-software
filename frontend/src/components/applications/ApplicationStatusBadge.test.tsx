import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

describe('ApplicationStatusBadge', () => {
  it('mostra o rótulo em português do status', () => {
    render(<ApplicationStatusBadge status="IN_PROGRESS" />);

    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('renderiza os quatro status', () => {
    const expected: Array<
      [Parameters<typeof ApplicationStatusBadge>[0]['status'], string]
    > = [
      ['PENDING', 'Aguardando'],
      ['IN_PROGRESS', 'Em andamento'],
      ['COMPLETED', 'Finalizada'],
      ['REJECTED', 'Recusada'],
    ];

    for (const [status, label] of expected) {
      const { unmount } = render(<ApplicationStatusBadge status={status} />);

      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });
});
