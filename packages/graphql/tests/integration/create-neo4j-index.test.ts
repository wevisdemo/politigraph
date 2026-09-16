import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createNeo4jIndex } from '../../neo4j-graphql';
import { cleanDatabase, driver } from './helpers';

async function run(cypher: string) {
	const session = driver.session();
	try {
		return await session.run(cypher);
	} finally {
		await session.close();
	}
}

describe('createNeo4jIndex', () => {
	beforeAll(async () => {
		await cleanDatabase();
		await run('CALL apoc.schema.assert({}, {})');
	});

	afterAll(async () => {
		await cleanDatabase();
	});

	test('creates constraints and indexes idempotently', async () => {
		await createNeo4jIndex();
		await createNeo4jIndex();

		const { records } = await run(
			'SHOW INDEXES YIELD name, owningConstraint RETURN collect(name) AS names, count(owningConstraint) AS constraints',
		);
		const names: string[] = records[0]?.get('names');

		expect(names).toContain('constraint_person_id');
		expect(names).toContain('index_bill_lis_id');
		expect(records[0]?.get('constraints').toNumber()).toBe(9);
	});

	test('rejects duplicate ids', async () => {
		await run("CREATE (:Person {id: 'dup'})");

		await expect(run("CREATE (:Person {id: 'dup'})")).rejects.toThrow(
			/already exists/,
		);
	});
});
