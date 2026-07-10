import './env';
import { z } from 'zod';

const schema = z.object({
	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
});

const env = schema.parse(process.env);

export const serverConfig = {
	port: env.PORT,
	isProduction: env.NODE_ENV === 'production',
	isDevelopment: env.NODE_ENV === 'development',
};
