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
			command: 'cd ../.. && bun run dev --filter=@politigraph/api',
			port: 3000,
			reuseExistingServer: !process.env.CI,
			timeout: 30000,
		},
		{
			command: 'bun run dev',
			port: 8000,
			reuseExistingServer: !process.env.CI,
			timeout: 30000,
		},
	],
});
