import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:8000/admin',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
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
