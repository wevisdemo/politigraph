import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
	assertNoPendingMigrations,
	getPendingMigrations,
	runMigrations,
	toStatements,
} from '../../neo4j/migrate';
import { migrations } from '../../neo4j/migrations';
import { driver } from './helpers';

async function run(cypher: string) {
	const session = driver.session();
	try {
		return await session.run(cypher);
	} finally {
		await session.close();
	}
}

async function resetDatabase() {
	await run('MATCH (n) DETACH DELETE n');
	await run('CALL apoc.schema.assert({}, {})');
}

describe('runMigrations', () => {
	beforeAll(resetDatabase);
	afterAll(async () => {
		await resetDatabase();
		await runMigrations();
	});

	test('reports every migration as pending on an empty database', async () => {
		expect(await getPendingMigrations()).toEqual(migrations);
		await expect(assertNoPendingMigrations()).rejects.toThrow(
			/pending migration/,
		);
	});

	test('applies migrations once and records them', async () => {
		await runMigrations();
		await runMigrations();

		const { records } = await run(
			'SHOW INDEXES YIELD name, owningConstraint RETURN collect(name) AS names, count(owningConstraint) AS constraints',
		);
		const names: string[] = records[0]?.get('names');
		const ledger = await run(
			'MATCH (m:__Migration) RETURN collect(m.id) AS ids',
		);

		expect(names).toContain('constraint_person_id');
		expect(names).not.toContain('index_bill_lis_id');
		expect(records[0]?.get('constraints').toNumber()).toBe(10);
		expect(ledger.records[0]?.get('ids')).toEqual(
			migrations.map(({ id }) => id),
		);
		await expect(assertNoPendingMigrations()).resolves.toBeUndefined();
	});

	test('migrates populated data and is safe to re-run', async () => {
		const applyAll = async () => {
			for (const { cypher } of migrations) {
				for (const statement of toStatements(cypher)) {
					await run(statement);
				}
			}
		};
		const snapshot = async () => {
			const nodes = await run(
				'MATCH (n) WHERE NOT n:__Migration RETURN labels(n) AS labels, properties(n) AS props ORDER BY n.id',
			);
			const relationships = await run(
				'MATCH ()-[r]->() RETURN properties(r) AS props ORDER BY r.id',
			);
			const indexes = await run(
				'SHOW INDEXES YIELD name RETURN collect(name) AS names',
			);

			const indexNames: string[] = indexes.records[0]?.get('names');

			return JSON.stringify([
				nodes.records.map((r) => [r.get('labels'), r.get('props')]),
				relationships.records.map((r) => r.get('props')),
				indexNames.toSorted(),
			]);
		};

		await run(
			`CREATE (:Bill {id: 'b', lis_id: 7}), (:Bill {id: 'c', lis_ids: [8, 9]}), (:VoteEvent {id: 'v', msbis_id: 3})
			CREATE (:Vote {id: 'iso', created_at: '2025-05-26T02:45:16.884Z'})-[:VOTED_BY]->(:Person {id: 'p'})
			CREATE (:Vote {id: 'kept'})-[:VOTED_BY {id: 'existing', created_at: datetime('2024-01-01T00:00:00Z')}]->(:Person {id: 'q'})`,
		);
		await applyAll();
		const afterFirstRun = await snapshot();
		const relations = await run(
			`MATCH (vote:Vote)-[r:VOTED_BY]->()
			RETURN r.id IS NOT NULL AND r.id <> 'existing' AS generated, r.created_at.epochMillis AS createdAt
			ORDER BY vote.id`,
		);
		expect(
			relations.records.map((r) => [
				r.get('generated'),
				new Date(r.get('createdAt').toNumber()).toISOString(),
			]),
		).toEqual([
			[true, '2025-05-26T02:45:16.884Z'],
			[false, '2024-01-01T00:00:00.000Z'],
		]);
		const bills = await run(
			'MATCH (b:Bill) RETURN [x IN b.lis_ids | toString(x)] AS lis_ids, b.lis_id IS NULL AS removed ORDER BY b.id',
		);
		expect(
			bills.records.map((r) => [r.get('lis_ids'), r.get('removed')]),
		).toEqual([
			[['7'], true],
			[['8', '9'], true],
		]);
		await applyAll();

		expect(await snapshot()).toBe(afterFirstRun);
	});

	test('rejects a migration modified after being applied', async () => {
		await run("MATCH (m:__Migration) SET m.checksum = 'stale'");

		await expect(runMigrations()).rejects.toThrow(
			/modified after being applied/,
		);
	});

	test('enforces unique ids', async () => {
		await run("CREATE (:Person {id: 'dup'})");

		await expect(run("CREATE (:Person {id: 'dup'})")).rejects.toThrow(
			/already exists/,
		);
	});
});
