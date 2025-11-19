import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
	throw Error('DATABASE_URL env is not provided');
}

export default defineConfig({
	dialect: 'postgresql',
	schema: 'auth-schema.ts',
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
