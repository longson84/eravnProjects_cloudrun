import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./vitest.setup.ts'],
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.test.ts', 'src/__tests__/**'],
        },
        // Ensure clean mock state between tests
        restoreMocks: true,
        clearMocks: true,
    },
    resolve: {
        alias: {
            // Handle .js extension imports in ESM
        },
    },
});
