import { loadMigrations } from './load' with { type: 'macro' };

export const migrations: { id: string; cypher: string }[] = loadMigrations();
