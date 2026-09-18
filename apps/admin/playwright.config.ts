import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

export const STORAGE_STATE = fileURLToPath(
	new URL('./tests/e2e/.auth/user.json', import.meta.url),
);

// Dedicated ports so e2e can run alongside the dev servers on 3000/8000
const API_PORT = 3100;
const ADMIN_PORT = 8100;
const adminOrigin = `http://localhost:${ADMIN_PORT}`;

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 2 : 4,
	reporter: 'html',
	use: {
		baseURL: `${adminOrigin}/admin`,
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
			port: API_PORT,
			reuseExistingServer: true,
			timeout: 30000,
			env: {
				NODE_ENV: 'test',
				PORT: `${API_PORT}`,
			},
		},
		{
			command: `bun run dev --port ${ADMIN_PORT}`,
			port: ADMIN_PORT,
			reuseExistingServer: true,
			timeout: 30000,
			env: {
				API_URL: `http://localhost:${API_PORT}`,
				NUXT_BUILD_DIR: 'node_modules/.cache/nuxt-e2e',
				VITE_CACHE_DIR: 'node_modules/.cache/vite-e2e',
				NUXT_PUBLIC_BASE_URL: adminOrigin,
			},
		},
	],
});
