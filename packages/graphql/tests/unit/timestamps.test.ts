import {
	afterAll,
	beforeEach,
	describe,
	expect,
	mock,
	setSystemTime,
	spyOn,
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

const {
	getLastNodeUpdatedAt,
	getLastVoteEventScrapedAt,
	latestTimestampQuery,
	resetTimestampsCache,
} = await import('../../timestamps');

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

describe('getLastNodeUpdatedAt', () => {
	beforeEach(() => {
		runCount = 0;
		latestEpochMs = Date.parse('2026-08-05T03:00:00Z');
		resetTimestampsCache();
		setSystemTime(new Date('2026-08-05T09:00:00Z'));
	});

	test('returns the latest timestamp as a UTC ISO string', async () => {
		expect(await getLastNodeUpdatedAt()).toBe('2026-08-05T03:00:00.000Z');
	});

	test('queries once within the cache window', async () => {
		await getLastNodeUpdatedAt();

		setSystemTime(new Date('2026-08-05T09:59:00Z'));
		latestEpochMs = Date.parse('2026-08-06T03:00:00Z');

		expect(await getLastNodeUpdatedAt()).toBe('2026-08-05T03:00:00.000Z');
		expect(runCount).toBe(1);
	});

	test('re-queries after the cache expires', async () => {
		await getLastNodeUpdatedAt();

		setSystemTime(new Date(Date.now() + HOUR_MS));
		latestEpochMs = Date.parse('2026-08-06T03:00:00Z');

		expect(await getLastNodeUpdatedAt()).toBe('2026-08-06T03:00:00.000Z');
		expect(runCount).toBe(2);
	});

	test('shares a single query between concurrent cache misses', async () => {
		const results = await Promise.all([
			getLastNodeUpdatedAt(),
			getLastNodeUpdatedAt(),
			getLastNodeUpdatedAt(),
		]);

		expect(results).toEqual([
			'2026-08-05T03:00:00.000Z',
			'2026-08-05T03:00:00.000Z',
			'2026-08-05T03:00:00.000Z',
		]);
		expect(runCount).toBe(1);
	});
});

describe('getLastVoteEventScrapedAt', () => {
	const fetchSpy = spyOn(globalThis, 'fetch');

	const respondWith = (workflow_runs: object[]) =>
		fetchSpy.mockResolvedValue(Response.json({ workflow_runs }));

	beforeEach(() => {
		fetchSpy.mockReset();
		resetTimestampsCache();
		setSystemTime(new Date('2026-09-28T00:00:00Z'));
	});

	afterAll(() => {
		fetchSpy.mockRestore();
	});

	test('returns the completion time of the latest successful run', async () => {
		respondWith([
			{ conclusion: null, updated_at: '2026-09-28T00:00:00Z' },
			{ conclusion: 'failure', updated_at: '2026-09-27T21:00:00Z' },
			{ conclusion: 'success', updated_at: '2026-09-20T19:19:20Z' },
			{ conclusion: 'success', updated_at: '2026-09-13T19:31:03Z' },
		]);

		expect(await getLastVoteEventScrapedAt()).toBe('2026-09-20T19:19:20.000Z');
		expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(
			'/workflows/scrape_and_ocr_votes.yml/runs',
		);
	});

	test('serves the previous value when a reload fails, and throws without one', async () => {
		fetchSpy.mockResolvedValue(new Response(null, { status: 503 }));

		await expect(getLastVoteEventScrapedAt()).rejects.toThrow('503');

		respondWith([
			{ conclusion: 'success', updated_at: '2026-09-20T19:19:20Z' },
		]);
		await getLastVoteEventScrapedAt();

		setSystemTime(new Date(Date.now() + HOUR_MS));
		fetchSpy.mockResolvedValue(new Response(null, { status: 503 }));

		expect(await getLastVoteEventScrapedAt()).toBe('2026-09-20T19:19:20.000Z');
		expect(fetchSpy).toHaveBeenCalledTimes(3);
	});
});
