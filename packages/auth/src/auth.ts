import { inspect } from 'node:util';
import { apiKey } from '@better-auth/api-key';
import { serverConfig } from '@politigraph/config/server';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, jwt, openAPI } from 'better-auth/plugins';
import { db } from './db';
import * as schema from './schema/auth';

export const trustedOrigins = [
	'http://localhost:3000',
	'http://localhost:8000',
	// Admin e2e server
	'http://localhost:8100',
	'https://politigraph.wevis.info',
];

const EMAIL_PATTERN = /[\w.%+-]+@[\w-]+(\.[\w-]+)+/g;

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
		jwt({
			jwt: {
				// Only the id: an API key's session carries the raw key as its token
				definePayload: ({ user, session }) => ({ ...user, sid: session.id }),
			},
		}),
		...(!serverConfig.isProduction ? [openAPI()] : []),
	],
	emailAndPassword: {
		enabled: true,
		disableSignUp: serverConfig.isProduction,
	},
	trustedOrigins,
	logger: {
		// PDPA: failed sign-ins log the email, which would persist in container logs
		log: (level, message, ...args) =>
			console[level](
				`[Better Auth] ${[message, ...args]
					.map((part) => (typeof part === 'string' ? part : inspect(part)))
					.join(' ')
					.replace(EMAIL_PATTERN, '[email]')}`,
			),
	},
});
