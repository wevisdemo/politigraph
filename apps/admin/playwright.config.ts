import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

export const STORAGE_STATE = fileURLToPath(
	new URL('./tests/e2e/.auth/user.json', import.meta.url),
);

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 2 : 4,
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:8000/admin',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'setup',
			testMatch: /auth\.setup\.ts/,
		},
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
			dependencies: ['setup'],
			testIgnore: /change-password/,
		},
		{
			// Changing the password revokes every other session, so this must run alone after everything else
			name: 'change-password',
			testMatch: /change-password/,
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['chromium'],
		},
	],
	webServer: [
		{
			command: 'bun run ../api/src/server.ts',
			port: 3000,
			reuseExistingServer: true,
			timeout: 30000,
			env: {
				NODE_ENV: 'test',
			},
		},
		{
			command: 'bun run dev',
			port: 8000,
			reuseExistingServer: true,
			timeout: 30000,
		},
	],
});
