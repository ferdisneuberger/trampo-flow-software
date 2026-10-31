import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { authService } from '../services/api/auth.service';
import {
  AUTH_UNAUTHORIZED_EVENT,
  tokenStorage,
} from '../services/api/token-storage';
import type { AuthUser, LoginInput } from '../services/auth.types';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(
    () => tokenStorage.get() !== null,
  );

  useEffect(() => {
    const token = tokenStorage.get();

    if (!token) {
      setIsLoading(false);

      return;
    }

    let isActive = true;

    void authService
      .me()
      .then((profile) => {
        if (isActive) {
          setUser(profile);
        }
      })
      .catch(() => {
        tokenStorage.clear();

        if (isActive) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      tokenStorage.clear();
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const response = await authService.login(input);

    tokenStorage.set(response.accessToken);
    setUser(response.user);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setIsLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
