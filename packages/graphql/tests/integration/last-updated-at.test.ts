import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from 'bun:test';
import { type Session } from 'neo4j-driver';
import { resetLastUpdatedAtCache } from '../../last-updated-at';
import {
	buildSchema,
	cleanDatabase,
	driver,
	execute,
	seedPerson,
	seedVoteEvent,
} from './helpers';

const QUERY = '{ lastUpdatedAt }';

describe('Query.lastUpdatedAt', () => {
	let schema: Awaited<ReturnType<typeof buildSchema>>;
	let session: Session;

	beforeAll(async () => {
		schema = await buildSchema();
		session = driver.session();
	});

	afterAll(async () => {
		await session.close();
	});

	beforeEach(async () => {
		await cleanDatabase();
		resetLastUpdatedAtCache();
	});

	test('returns null when there is no data', async () => {
		const { data, errors } = await execute(schema, QUERY);

		expect(errors).toBeUndefined();
		expect(data?.lastUpdatedAt).toBeNull();
	});

	test('returns the latest timestamp across all node labels', async () => {
		await seedPerson(session, {
			id: 'person-1',
			firstname: 'สมชาย',
			lastname: 'สุขสวัสดิ์',
		});
		await session.run(
			`MATCH (p:Person {id: 'person-1'})
			SET p.created_at = datetime('2020-01-01T00:00:00Z'),
				p.updated_at = datetime('2020-01-02T00:00:00Z')`,
		);
		await seedVoteEvent(session, { id: 'vote-event-1' });
		await session.run(
			`MATCH (ve:VoteEvent {id: 'vote-event-1'})
			SET ve.created_at = datetime('2026-08-05T18:00:00Z'),
				ve.updated_at = null`,
		);

		const { data, errors } = await execute(schema, QUERY);

		expect(errors).toBeUndefined();
		expect(data?.lastUpdatedAt).toBe('2026-08-05T18:00:00.000Z');
	});

	test('handles timestamps stored as ISO strings', async () => {
		await seedPerson(session, {
			id: 'person-1',
			firstname: 'สมชาย',
			lastname: 'สุขสวัสดิ์',
		});
		await session.run(
			`MATCH (p:Person {id: 'person-1'})
			SET p.created_at = datetime('2024-01-01T00:00:00Z'),
				p.updated_at = null`,
		);
		await seedVoteEvent(session, { id: 'vote-event-1' });
		await session.run(
			`MATCH (ve:VoteEvent {id: 'vote-event-1'})
			SET ve.created_at = '2025-03-14T05:00:00.000Z',
				ve.updated_at = null`,
		);

		const { data, errors } = await execute(schema, QUERY);

		expect(errors).toBeUndefined();
		expect(data?.lastUpdatedAt).toBe('2025-03-14T05:00:00.000Z');
	});

	test('serves a cached value until it is reset', async () => {
		await seedPerson(session, {
			id: 'person-1',
			firstname: 'สมชาย',
			lastname: 'สุขสวัสดิ์',
		});
		await session.run(
			`MATCH (p:Person {id: 'person-1'})
			SET p.created_at = datetime('2024-03-01T00:00:00Z'),
				p.updated_at = datetime('2024-03-01T00:00:00Z')`,
		);

		const { data } = await execute(schema, QUERY);
		expect(data?.lastUpdatedAt).toBe('2024-03-01T00:00:00.000Z');

		await cleanDatabase();

		const { data: cached } = await execute(schema, QUERY);
		expect(cached?.lastUpdatedAt).toBe('2024-03-01T00:00:00.000Z');
	});
});
