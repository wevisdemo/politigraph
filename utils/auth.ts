import { existsSync, mkdirSync } from 'fs';
import { betterAuth } from 'better-auth';
import { jwt, openAPI } from 'better-auth/plugins';
import Database from 'better-sqlite3';

const BETTER_AUTH_PATH = '.better-auth';

if (!existsSync(BETTER_AUTH_PATH)) {
	mkdirSync(BETTER_AUTH_PATH);
}

process.env.BETTER_AUTH_URL =
	process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export const auth = betterAuth({
	basePath: 'auth',
	database: new Database(`${BETTER_AUTH_PATH}/sqlite.db`),
	plugins: [
		jwt(),
		...(process.env.NODE_ENV !== 'production' ? [openAPI()] : []),
	],
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: [process.env.BETTER_AUTH_URL],
});
