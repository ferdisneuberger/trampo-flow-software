import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
      exclude: [
        'src/application/**/dtos/**',
        'src/application/**/errors/**',
        'src/application/**/types/**',
        'src/application/shared/errors/**',
      ],
    },
  },
});
