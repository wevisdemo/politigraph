import { databaseUrl } from '@politigraph/config/postgres';
import { $ } from 'bun';

process.env.DATABASE_URL = databaseUrl;
await $`bun run --bun drizzle-kit migrate`;
