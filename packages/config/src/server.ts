import './env';
import { z } from 'zod';

/** Unset and empty are both treated as absent, so a blank `.env` entry falls through to the default */
const optionalUrl = (name: string) =>
	z.union([z.url(`${name} must be a valid URL`), z.literal('')]).optional();

const schema = z.object({
	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
	PUBLIC_SITE_URL: optionalUrl('PUBLIC_SITE_URL'),
});

const env = schema.parse(process.env);

const DEV_SITE_URL = 'http://localhost:4321';
const PROD_SITE_URL = 'https://politigraph.wevis.info';

const isProduction = env.NODE_ENV === 'production';

export const serverConfig = {
	port: env.PORT,
	siteUrl: env.PUBLIC_SITE_URL || (isProduction ? PROD_SITE_URL : DEV_SITE_URL),
	isProduction,
	isDevelopment: env.NODE_ENV === 'development',
};
