import { $ } from 'bun';

await $`DATABASE_URL=${process.env.DATABASE_URL} bunx --bun drizzle-kit migrate`;
