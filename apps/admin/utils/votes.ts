import type { Vote, VoteEvent } from '@politigraph/graphql/genql';
import { standardVoteOptions, voteCountKeyMap } from '~/constants/votes';

export type VoteIssueType =
	| 'COUNT_MISMATCHED'
	| 'DUPLICATED'
	| 'INVALID_OPTION'
	| 'INVALID_VOTER_NAME'
	| 'MISSING_INFORMATION';

export interface VoteIssue {
	type: VoteIssueType;
	id?: string;
}

/**
 * Resolves the voter a row points at, preferring an unsaved selection over the persisted link.
 *
 * @param vote - Vote row with its persisted voters.
 * @param selectedVoterIds - Unsaved voter selections keyed by vote id.
 * @returns The person id the row should be linked to, or an empty string when unlinked.
 */
export function getEffectiveVoterId(
	vote: Pick<Vote, 'id'> & { voters: { id: string }[] },
	selectedVoterIds: Record<string, string>,
) {
	return selectedVoterIds[vote.id] ?? vote.voters[0]?.id ?? '';
}

/**
 * Validates vote rows against the summary header and per-row constraints.
 *
 * @param votes - Vote rows plus the summary counts they should match.
 * @returns Validation errors and warnings for the provided votes.
 */
export function validateVotes({
	votes,
	...summaryHeader
}: Pick<
	VoteEvent,
	'agree_count' | 'disagree_count' | 'abstain_count' | 'novote_count'
> & {
	votes: (Pick<
		Vote,
		| 'id'
		| 'vote_order'
		| 'badge_number'
		| 'option'
		| 'voter_name_raw'
		| 'voter_party'
	> & {
		voters: { id: string }[];
	})[];
}) {
	const errors: VoteIssue[] = [];
	const warnings: VoteIssue[] = [];

	const getVoterKey = (vote: (typeof votes)[number]) =>
		vote.voters[0]?.id ?? vote.voter_name_raw;

	const countByOption = new Map<string, number>();
	const countByVoterKey = new Map<string, number>();

	votes.forEach((vote) => {
		countByOption.set(vote.option, (countByOption.get(vote.option) ?? 0) + 1);
		countByVoterKey.set(
			getVoterKey(vote),
			(countByVoterKey.get(getVoterKey(vote)) ?? 0) + 1,
		);
	});

	if (
		[...voteCountKeyMap.entries()].some(
			([option, key]) =>
				(countByOption.get(option) ?? 0) !== (summaryHeader[key] ?? 0),
		)
	) {
		errors.push({
			type: 'COUNT_MISMATCHED',
		});
	}

	votes.forEach((vote) => {
		if (!vote.id || !vote.vote_order || !vote.badge_number) {
			warnings.push({ type: 'MISSING_INFORMATION', id: vote.id });
		}

		if (vote.voters.length === 0) {
			warnings.push({ type: 'INVALID_VOTER_NAME', id: vote.id });
		}

		if (!standardVoteOptions.includes(vote.option)) {
			errors.push({ type: 'INVALID_OPTION', id: vote.id });
		}

		if ((countByVoterKey.get(getVoterKey(vote)) ?? 0) > 1) {
			errors.push({
				type: 'DUPLICATED',
				id: vote.id,
			});
		}
	});

	return { errors, warnings };
}
