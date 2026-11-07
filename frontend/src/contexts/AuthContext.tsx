import { useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useRef,
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
  AuthThemePreference,
  AuthUser,
  GoogleLoginInput,
  LoginInput,
} from '../services/auth.types';
import { AuthContext, useAuth, type AuthContextValue } from './auth-context';
import { DEFAULT_THEME_PREFERENCE, useTheme } from './theme-context';

/**
 * Envia para a conta só o tema escolhido nesta aba (`origin === 'local'`).
 * Mudanças vindas do servidor ou de outra aba não são reenviadas, para que um
 * logout ou uma troca em outra aba não sobrescreva a preferência salva.
 */
function ThemePreferenceSync() {
  const { user, updateThemePreference } = useAuth();
  const { theme, origin, setTheme } = useTheme();
  const latestThemeRef = useRef(theme);

  useEffect(() => {
    latestThemeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (!user || origin !== 'local' || theme === user.themePreference) {
      return;
    }

    const savedTheme = user.themePreference;

    void updateThemePreference(theme).catch(() => {
      // Só desfaz se o usuário não escolheu outro tema enquanto isso.
      if (latestThemeRef.current === theme) {
        setTheme(savedTheme, { origin: 'external' });
      }
    });
  }, [theme, origin, user, updateThemePreference, setTheme]);

  return null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyProfile = useCallback(
    (profile: AuthUser | null) => {
      setUser(profile);

      if (profile) {
        setTheme(profile.themePreference, { origin: 'external' });
      }
    },
    [setTheme],
  );

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      try {
        await refreshAccessToken();

        const profile = await authService.me();

        if (isActive) {
          applyProfile(profile);
        }
      } catch {
        accessTokenStore.clear();

        if (isActive) {
          applyProfile(null);
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
  }, [applyProfile]);

  useEffect(() => {
    const handleUnauthorized = () => {
      accessTokenStore.clear();
      queryClient.clear();
      applyProfile(null);
      setTheme(DEFAULT_THEME_PREFERENCE, { origin: 'external' });
      setIsLoading(false);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [queryClient, applyProfile, setTheme]);

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

      applyProfile(profile);
      setIsLoading(false);
    },
    [queryClient, applyProfile],
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

      applyProfile(profile);
      setIsLoading(false);
    },
    [queryClient, applyProfile],
  );

  const refreshProfile = useCallback(async () => {
    const profile = await authService.me();

    applyProfile(profile);
  }, [applyProfile]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // O logout local deve acontecer mesmo se a API estiver indisponível.
    } finally {
      accessTokenStore.clear();
      queryClient.clear();
      applyProfile(null);
      setTheme(DEFAULT_THEME_PREFERENCE, { origin: 'external' });
      setIsLoading(false);
    }
  }, [queryClient, applyProfile, setTheme]);

  const updateThemePreference = useCallback(
    async (themePreference: AuthThemePreference) => {
      const profile = await authService.updateThemePreference({
        themePreference,
      });

      // Atualiza só o tema salvo: a resposta pode chegar depois de uma escolha
      // mais nova, e o resto do perfil (como o cooldown de reenvio) não muda.
      setUser((current) =>
        current
          ? { ...current, themePreference: profile.themePreference }
          : current,
      );
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      loginWithGoogle,
      logout,
      refreshProfile,
      updateThemePreference,
    }),
    [
      user,
      isLoading,
      login,
      loginWithGoogle,
      logout,
      refreshProfile,
      updateThemePreference,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      <ThemePreferenceSync />
      {children}
    </AuthContext.Provider>
  );
}
