import {
	afterAll,
	beforeEach,
	describe,
	expect,
	mock,
	setSystemTime,
	test,
} from 'bun:test';

let runCount = 0;
let latestEpochMs = 0;

mock.module('../../driver', () => ({
	driver: {
		session: () => ({
			run: async () => {
				runCount++;
				return {
					records: [{ get: () => ({ toString: () => `${latestEpochMs}` }) }],
				};
			},
			close: async () => {},
		}),
	},
}));

const { getLastUpdatedAt, latestTimestampQuery, resetLastUpdatedAtCache } =
	await import('../../last-updated-at');

const HOUR_MS = 60 * 60 * 1000;

afterAll(() => {
	setSystemTime();
});

describe('latestTimestampQuery', () => {
	test('covers every node label and timestamp field', () => {
		const branches = latestTimestampQuery.split('UNION ALL');

		expect(branches).toHaveLength(30);
		expect(latestTimestampQuery).toContain(
			'MATCH (n:Person) WHERE n.updated_at IS NOT NULL',
		);
		expect(latestTimestampQuery).toContain(
			'MATCH (n:Vote) WHERE n.created_at IS NOT NULL',
		);
	});

	test('coerces string timestamps before ordering', () => {
		expect(latestTimestampQuery).toContain(
			'CASE WHEN n.created_at IS :: STRING THEN datetime(n.created_at)',
		);
	});

	test('does not query non-node types', () => {
		expect(latestTimestampQuery).not.toContain('(n:Query)');
		expect(latestTimestampQuery).not.toContain('(n:Relation)');
	});
});

describe('getLastUpdatedAt', () => {
	beforeEach(() => {
		runCount = 0;
		latestEpochMs = Date.parse('2026-08-05T03:00:00Z');
		resetLastUpdatedAtCache();
		setSystemTime(new Date('2026-08-05T09:00:00Z'));
	});

	test('returns the latest timestamp as a UTC ISO string', async () => {
		expect(await getLastUpdatedAt()).toBe('2026-08-05T03:00:00.000Z');
	});

	test('queries once within the cache window', async () => {
		await getLastUpdatedAt();

		setSystemTime(new Date('2026-08-05T09:59:00Z'));
		latestEpochMs = Date.parse('2026-08-06T03:00:00Z');

		expect(await getLastUpdatedAt()).toBe('2026-08-05T03:00:00.000Z');
		expect(runCount).toBe(1);
	});

	test('re-queries after the cache expires', async () => {
		await getLastUpdatedAt();

		setSystemTime(new Date(Date.now() + HOUR_MS));
		latestEpochMs = Date.parse('2026-08-06T03:00:00Z');

		expect(await getLastUpdatedAt()).toBe('2026-08-06T03:00:00.000Z');
		expect(runCount).toBe(2);
	});

	test('shares a single query between concurrent cache misses', async () => {
		const results = await Promise.all([
			getLastUpdatedAt(),
			getLastUpdatedAt(),
			getLastUpdatedAt(),
		]);

		expect(results).toEqual([
			'2026-08-05T03:00:00.000Z',
			'2026-08-05T03:00:00.000Z',
			'2026-08-05T03:00:00.000Z',
		]);
		expect(runCount).toBe(1);
	});
});
