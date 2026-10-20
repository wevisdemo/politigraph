import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadMigrations() {
	return readdirSync(import.meta.dir)
		.filter((file) => file.endsWith('.cypher'))
		.sort()
		.map((file) => ({
			id: file.replace('.cypher', ''),
			cypher: readFileSync(join(import.meta.dir, file), 'utf8'),
		}));
}
