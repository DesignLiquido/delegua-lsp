import type { Config } from '@jest/types';

export default async (): Promise<Config.InitialOptions> => {
    return {
        verbose: true,
        modulePathIgnorePatterns: ['<rootDir>/dist/'],
        preset: 'ts-jest',
        testEnvironment: 'node',
        testMatch: ['**/testes/**/*.test.ts'],
        transform: {
            '^.+\\.tsx?$': ['ts-jest', {
                isolatedModules: false,
                tsconfig: 'testes/tsconfig.json',
            }]
        },
        coverageReporters: ['json-summary', 'lcov', 'text', 'text-summary'],
    };
};
