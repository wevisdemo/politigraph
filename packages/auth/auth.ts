import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { apiKey, jwt, openAPI } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './auth-schema';
import { trustedOrigins } from './trust-origins';

if (!process.env.DATABASE_URL) {
	throw Error('DATABASE_URL env is not provided');
}

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
	trustedOrigins,
});
