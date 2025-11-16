import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { apiKey, jwt, openAPI } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './auth-schema';

if (!process.env.DATABASE_URL) {
	throw Error('DATABASE_URL env is not provided');
}

process.env.BETTER_AUTH_URL =
	process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:8000';

const db = drizzle(process.env.DATABASE_URL);

export const auth = betterAuth({
	basePath: 'auth',
	database: drizzleAdapter(db, {
		provider: 'pg',
		usePlural: true,
		schema,
	}),
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
