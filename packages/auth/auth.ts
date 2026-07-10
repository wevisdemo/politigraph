import { databaseUrl } from '@politigraph/config/postgres';
import { serverConfig } from '@politigraph/config/server';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, apiKey, jwt, openAPI } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './auth-schema';

export const trustedOrigins = [
	'http://localhost:3000',
	'http://localhost:8000',
	'https://politigraph.wevis.info',
];

const db = drizzle(databaseUrl);

export const auth = betterAuth({
	basePath: 'auth',
	database: drizzleAdapter(db, {
		provider: 'pg',
		usePlural: true,
		schema,
	}),
	plugins: [
		admin(),
		apiKey({
			enableSessionForAPIKeys: true,
			rateLimit: {
				enabled: false,
			},
		}),
		jwt(),
		...(!serverConfig.isProduction ? [openAPI()] : []),
	],
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins,
});
