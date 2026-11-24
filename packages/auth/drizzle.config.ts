import { databaseUrl } from '@politigraph/config/postgres';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dialect: 'postgresql',
	schema: 'src/schema',
	dbCredentials: {
		url: databaseUrl,
	},
});
