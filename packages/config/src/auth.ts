import './env';
import { z } from 'zod';

const schema = z.object({
	BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
	BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),
});

const env = schema.parse(process.env);

export const authConfig = {
	secret: env.BETTER_AUTH_SECRET,
	url: env.BETTER_AUTH_URL,
};
