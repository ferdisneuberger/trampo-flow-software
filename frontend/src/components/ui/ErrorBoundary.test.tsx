import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('mostra a tela de erro quando um filho lança', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Recarregar página' }),
    ).toBeInTheDocument();
  });

  it('reseta o erro quando a resetKey muda', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="/b">
        <p>Conteúdo recuperado</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Conteúdo recuperado')).toBeInTheDocument();
  });
});
