import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/render';
import { TermsPage } from './TermsPage';

describe('TermsPage', () => {
  it('mostra os termos e o caminho de volta', () => {
    renderWithProviders(<TermsPage />, { route: '/termos' });

    expect(
      screen.getByRole('heading', { name: /Termos de uso do Trampo Flow/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Versão 2026-11')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voltar para o cadastro' }),
    ).toHaveAttribute('href', '/cadastro');
  });
});
