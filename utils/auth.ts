import { betterAuth } from 'better-auth';
import { jwt, openAPI } from 'better-auth/plugins';
import Database from 'better-sqlite3';

process.env.BETTER_AUTH_URL =
	process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export const auth = betterAuth({
	basePath: 'auth',
	database: new Database('.better-auth/sqlite.db'),
	plugins: [
		jwt(),
		...(process.env.NODE_ENV !== 'production' ? [openAPI()] : []),
	],
	emailAndPassword: {
		enabled: true,
	},
});
