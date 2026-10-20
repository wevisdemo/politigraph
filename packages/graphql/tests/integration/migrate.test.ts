import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
	assertNoPendingMigrations,
	getPendingMigrations,
	runMigrations,
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
		expect(names).toContain('index_bill_lis_id');
		expect(records[0]?.get('constraints').toNumber()).toBe(10);
		expect(ledger.records[0]?.get('ids')).toEqual(
			migrations.map(({ id }) => id),
		);
		await expect(assertNoPendingMigrations()).resolves.toBeUndefined();
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
