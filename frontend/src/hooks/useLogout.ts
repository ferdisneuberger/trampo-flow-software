import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';

export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const logoutAndRedirect = useCallback(async () => {
    setIsPending(true);

    try {
      await logout();
    } finally {
      setIsPending(false);
      void navigate('/login', { replace: true });
    }
  }, [logout, navigate]);

  return { logout: logoutAndRedirect, isPending };
}
