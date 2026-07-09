import type { Vote, VoteEvent } from '@politigraph/graphql/genql';
import { validateVotes } from '~/utils/votes';
import { describe, expect, test } from 'vitest';

type VoteInput = Pick<
	Vote,
	| 'id'
	| 'vote_order'
	| 'badge_number'
	| 'option'
	| 'voter_name_raw'
	| 'voter_party'
> & {
	voters: { id: string }[];
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
		voter_party: 'พรรค A',
		voters: [{ id: 'person-1' }],
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
			createVote({ id: 'v1', voters: [{ id: 'person-1' }] }),
			createVote({ id: 'v2', voters: [{ id: 'person-1' }] }),
		];
		const summary = createSummaryHeader({ agree_count: 2 });

		const result = validateVotes({ votes, ...summary });

		expect(result.errors.filter((e) => e.type === 'DUPLICATED')).toHaveLength(
			2,
		);
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

	test('warns about invalid voter names when no voters', () => {
		const votes = [createVote({ voters: [] })];
		const summary = createSummaryHeader({ agree_count: 1 });

		const result = validateVotes({ votes, ...summary });

		expect(result.warnings).toContainEqual({
			type: 'INVALID_VOTER_NAME',
			id: 'vote-1',
		});
	});

	test('returns empty errors and warnings for valid votes', () => {
		const votes = [
			createVote({
				id: 'v1',
				option: 'เห็นด้วย',
				voters: [{ id: 'person-1' }],
			}),
		];
		const summary = createSummaryHeader({ agree_count: 1 });

		const result = validateVotes({ votes, ...summary });

		expect(result.errors).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});
});
