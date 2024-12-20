import { betterAuth } from 'better-auth';
import { jwt, openAPI } from 'better-auth/plugins';
import Database from 'better-sqlite3';

export const auth = betterAuth({
	basePath: 'auth',
	database: new Database('.better-auth/sqlite.db'),
	plugins: [jwt(), openAPI()],
	emailAndPassword: {
		enabled: true,
	},
});

export default defineEventHandler((event) => auth.handler(toWebRequest(event)));
