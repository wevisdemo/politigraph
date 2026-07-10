import './env';
import { z } from 'zod';

const schema = z.object({
	DATABASE_URL: z
		.string()
		.url()
		.refine(
			(url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
			{ message: 'DATABASE_URL must start with postgresql:// or postgres://' },
		),
});

const env = schema.parse(process.env);

export const databaseUrl = env.DATABASE_URL;
