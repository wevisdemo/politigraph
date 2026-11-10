import type { Vote, VoteEvent } from '@politigraph/graphql/genql';
import {
	groupVoteLinkChanges,
	matchCreatedVotes,
	runWithRetries,
	validateVotes,
} from '~/utils/votes';
import { describe, expect, test, vi } from 'vitest';

type VoteInput = Pick<
	Vote,
	| 'id'
	| 'vote_order'
	| 'badge_number'
	| 'option'
	| 'voter_name_raw'
	| 'voter_affiliation_raw'
> & {
	voter: { id: string } | null;
	voter_affiliation: { id: string } | null;
};

type SummaryHeader = Pick<
	VoteEvent,
	'agree_count' | 'disagree_count' | 'abstain_count' | 'novote_count'
>;

function createVote(overrides: Partial<VoteInput> = {}): VoteInput {
	return {
		id: 'vote-1',
		vote_order: '1',
		badge_number: '001',
		option: 'เห็นด้วย',
		voter_name_raw: 'สมชาย ใจดี',
		voter_affiliation_raw: 'พรรค A',
		voter: { id: 'person-1' },
		voter_affiliation: { id: 'org-1' },
		...overrides,
	};
}

function createSummaryHeader(
	overrides: Partial<SummaryHeader> = {},
): SummaryHeader {
	return {
		agree_count: 1,
		disagree_count: 0,
		abstain_count: 0,
		novote_count: 0,
		...overrides,
	};
}

describe('validateVotes', () => {
	test('detects count mismatch', () => {
		const votes = [createVote()];
		const summary = createSummaryHeader({ agree_count: 2 });

		const result = validateVotes({ votes, ...summary });

		expect(result.errors).toContainEqual({ type: 'COUNT_MISMATCHED' });
	});

	test('does not flag count mismatch when counts match', () => {
		const votes = [
			createVote({ id: 'v1', option: 'เห็นด้วย' }),
			createVote({ id: 'v2', option: 'ไม่เห็นด้วย' }),
		];
		const summary = createSummaryHeader({
			agree_count: 1,
			disagree_count: 1,
		});

		const result = validateVotes({ votes, ...summary });

		expect(result.errors).not.toContainEqual({ type: 'COUNT_MISMATCHED' });
	});

	test('detects duplicated votes', () => {
		const votes = [
			createVote({ id: 'v1', voter: { id: 'person-1' } }),
			createVote({ id: 'v2', voter: { id: 'person-1' } }),
		];
		const summary = createSummaryHeader({ agree_count: 2 });

		const result = validateVotes({ votes, ...summary });

		expect(result.errors.filter((e) => e.type === 'DUPLICATED')).toHaveLength(
			2,
		);
	});

	test('detects duplicated votes by raw name when unlinked, without cross-flagging distinct voters', () => {
		const votes = [
			createVote({ id: 'v1', voter: null, voter_name_raw: 'สมชาย ใจดี' }),
			createVote({ id: 'v2', voter: null, voter_name_raw: 'สมชาย ใจดี' }),
			createVote({ id: 'v3', voter: { id: 'person-2' } }),
		];
		const summary = createSummaryHeader({ agree_count: 3 });

		const result = validateVotes({ votes, ...summary });

		expect(result.errors.filter((e) => e.type === 'DUPLICATED')).toEqual([
			{ type: 'DUPLICATED', id: 'v1' },
			{ type: 'DUPLICATED', id: 'v2' },
		]);
	});

	test('detects invalid option', () => {
		const votes = [createVote({ option: 'INVALID_OPTION' })];
		const summary = createSummaryHeader({ agree_count: 0 });

		const result = validateVotes({ votes, ...summary });

		expect(result.errors).toContainEqual({
			type: 'INVALID_OPTION',
			id: 'vote-1',
		});
	});

	test('warns about missing information', () => {
		const votes = [
			createVote({
				id: undefined,
				vote_order: undefined,
				badge_number: undefined,
			}),
		];
		const summary = createSummaryHeader({ agree_count: 1 });

		const result = validateVotes({ votes, ...summary });

		expect(result.warnings).toContainEqual({
			type: 'MISSING_INFORMATION',
			id: undefined,
		});
	});

	test('warns about unlinked voters and affiliations', () => {
		const votes = [createVote({ voter: null, voter_affiliation: null })];
		const summary = createSummaryHeader({ agree_count: 1 });

		const result = validateVotes({ votes, ...summary });

		expect(result.warnings).toEqual([
			{ type: 'INVALID_VOTER_NAME', id: 'vote-1' },
			{ type: 'UNLINKED_AFFILIATION', id: 'vote-1' },
		]);
	});

	test('returns empty errors and warnings for valid votes', () => {
		const votes = [
			createVote({
				id: 'v1',
				option: 'เห็นด้วย',
				voter: { id: 'person-1' },
			}),
		];
		const summary = createSummaryHeader({ agree_count: 1 });

		const result = validateVotes({ votes, ...summary });

		expect(result.errors).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});
});

describe('vote writes', () => {
	test('matchCreatedVotes pairs each row with a created vote of the same fields, and throws when one is missing', () => {
		const rows = [
			createVote({ id: 'row-1', vote_order: '1', voter_name_raw: 'ก' }),
			createVote({ id: 'row-2', vote_order: '2', voter_name_raw: 'ข' }),
			createVote({ id: 'row-3', vote_order: '2', voter_name_raw: 'ข' }),
		];
		const createdVotes = [
			createVote({ id: 'vote-b', vote_order: '2', voter_name_raw: 'ข' }),
			createVote({ id: 'vote-a', vote_order: '1', voter_name_raw: 'ก' }),
			createVote({ id: 'vote-c', vote_order: '2', voter_name_raw: 'ข' }),
		];

		expect(matchCreatedVotes(rows, createdVotes)).toEqual(
			new Map([
				['row-1', 'vote-a'],
				['row-2', 'vote-b'],
				['row-3', 'vote-c'],
			]),
		);
		expect(() => matchCreatedVotes(rows, createdVotes.slice(1))).toThrow();
	});

	test('groupVoteLinkChanges groups changed links by node and skips unchanged or empty ones', () => {
		expect(
			groupVoteLinkChanges([
				{ voteId: 'v1', from: '', to: 'p1' },
				{ voteId: 'v2', from: 'p2', to: 'p1' },
				{ voteId: 'v3', from: 'p2', to: '' },
				{ voteId: 'v4', from: 'p3', to: 'p3' },
			]),
		).toEqual({
			connect: new Map([['p1', ['v1', 'v2']]]),
			disconnect: new Map([['p2', ['v2', 'v3']]]),
		});
	});

	test('runWithRetries reruns only failed tasks and throws once attempts run out', async () => {
		const succeeding = vi.fn().mockResolvedValue(undefined);
		const flaky = vi
			.fn()
			.mockRejectedValueOnce(new Error('network'))
			.mockResolvedValue(undefined);
		const failing = vi.fn().mockRejectedValue(new Error('down'));

		await runWithRetries([succeeding, flaky]);
		expect(succeeding).toHaveBeenCalledTimes(1);
		expect(flaky).toHaveBeenCalledTimes(2);

		await expect(runWithRetries([failing], 3)).rejects.toThrow('down');
		expect(failing).toHaveBeenCalledTimes(3);
	});
});
