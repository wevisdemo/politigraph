import { databaseUrl } from '@politigraph/config/postgres';
import { drizzle } from 'drizzle-orm/bun-sql';

export const db = drizzle(databaseUrl);
