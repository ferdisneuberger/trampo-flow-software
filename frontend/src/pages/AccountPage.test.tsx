import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AccountPage } from './AccountPage';

const logout = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'fernando' },
    logout,
  }),
}));

describe('AccountPage', () => {
  it('mostra o usuário da sessão', () => {
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('fernando')).toBeInTheDocument();
  });

  it('encerra a sessão ao clicar no botão', async () => {
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /Encerrar sessão/ }),
    );

    expect(logout).toHaveBeenCalledOnce();
  });
});
