import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  route?: string;
  queryClient?: QueryClient;
};

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    queryClient = createTestQueryClient(),
    ...options
  }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}
