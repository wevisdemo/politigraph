import { exists, mkdir } from 'node:fs/promises';
import { betterAuth } from 'better-auth';
import { apiKey, jwt, openAPI } from 'better-auth/plugins';
import { Database } from 'bun:sqlite';

const BETTER_AUTH_PATH = '.better-auth';

if (!(await exists(BETTER_AUTH_PATH))) {
	await mkdir(BETTER_AUTH_PATH);
}

process.env.BETTER_AUTH_URL =
	process.env.BETTER_AUTH_URL || 'http://localhost:8000';

export const auth = betterAuth({
	basePath: 'auth',
	database: new Database(`${BETTER_AUTH_PATH}/sqlite.db`),
	plugins: [
		apiKey({
			enableSessionForAPIKeys: true,
			rateLimit: {
				enabled: false,
			},
		}),
		jwt(),
		...(process.env.NODE_ENV !== 'production' ? [openAPI()] : []),
	],
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: [process.env.BETTER_AUTH_URL],
});
