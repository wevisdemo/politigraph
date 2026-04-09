import { $ } from 'bun';

await $`DATABASE_URL=${process.env.DATABASE_URL} bun run --bun drizzle-kit migrate`;
