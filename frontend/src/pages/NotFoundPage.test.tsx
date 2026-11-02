import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/render';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('oferece retorno para o quadro', () => {
    renderWithProviders(<NotFoundPage />);

    expect(screen.getByText('Página não encontrada')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voltar para candidaturas' }),
    ).toHaveAttribute('href', '/candidaturas');
  });
});
