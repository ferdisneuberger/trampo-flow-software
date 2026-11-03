import { useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { authService } from '../services/api/auth.service';
import {
  accessTokenStore,
  AUTH_UNAUTHORIZED_EVENT,
} from '../services/api/access-token';
import { refreshAccessToken } from '../services/api/session';
import type {
  AuthUser,
  GoogleLoginInput,
  LoginInput,
} from '../services/auth.types';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      try {
        await refreshAccessToken();

        const profile = await authService.me();

        if (isActive) {
          setUser(profile);
        }
      } catch {
        accessTokenStore.clear();

        if (isActive) {
          setUser(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      accessTokenStore.clear();
      queryClient.clear();
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [queryClient]);

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await authService.login(input);

      queryClient.clear();
      accessTokenStore.set(response.accessToken);

      let profile = response.user;

      try {
        profile = await authService.me();
      } catch {
        profile = response.user;
      }

      setUser(profile);
      setIsLoading(false);
    },
    [queryClient],
  );

  const loginWithGoogle = useCallback(
    async (input: GoogleLoginInput) => {
      const response = await authService.googleLogin(input);

      queryClient.clear();
      accessTokenStore.set(response.accessToken);

      let profile = response.user;

      try {
        profile = await authService.me();
      } catch {
        profile = response.user;
      }

      setUser(profile);
      setIsLoading(false);
    },
    [queryClient],
  );

  const refreshProfile = useCallback(async () => {
    const profile = await authService.me();

    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // O logout local deve acontecer mesmo se a API estiver indisponível.
    } finally {
      accessTokenStore.clear();
      queryClient.clear();
      setUser(null);
      setIsLoading(false);
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      loginWithGoogle,
      logout,
      refreshProfile,
    }),
    [user, isLoading, login, loginWithGoogle, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
