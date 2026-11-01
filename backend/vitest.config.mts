import { defineConfig } from 'vitest/config';

// Os testes de integração contra Postgres só rodam quando TEST_DATABASE_URL
// existe. Sem ela, o threshold de cobertura seria distorcido pelos arquivos
// pulados, então ele só é aplicado na execução completa.
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    clearMocks: true,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/schemas/**',
        'src/application/**/dtos/**',
        'src/application/**/errors/**',
        'src/application/**/types/**',
      ],
      thresholds: hasTestDatabase
        ? { statements: 90, branches: 80, functions: 90, lines: 90 }
        : undefined,
    },
  },
});
