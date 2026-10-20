import { describe, expect, test } from 'bun:test';
import { toStatements } from '../../neo4j/migrate';
import { migrations } from '../../neo4j/migrations';

describe('migrations', () => {
	test('discovers numbered files in order without gaps', () => {
		const ids = migrations.map(({ id }) => id);

		expect(ids.length).toBeGreaterThan(0);
		expect(ids).toEqual([...ids].sort());
		expect(ids.map((id) => Number(id.slice(0, 4)))).toEqual(
			ids.map((_, index) => index + 1),
		);
		expect(ids.every((id) => /^\d{4}-[a-z0-9-]+$/.test(id))).toBe(true);
	});

	test('splits statements only on semicolons ending a line', () => {
		const cypher = `// header; ignored
MATCH (n) // see #12; legacy
SET n.note = 'a; b';

CREATE INDEX x IF NOT EXISTS FOR (n:N) ON (n.p);
// trailing comment`;

		expect(toStatements(cypher)).toEqual([
			"MATCH (n) // see #12; legacy\nSET n.note = 'a; b'",
			'CREATE INDEX x IF NOT EXISTS FOR (n:N) ON (n.p)',
		]);
	});
});
