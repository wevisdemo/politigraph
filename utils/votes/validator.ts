import type { Vote, VoteEvent } from '~/.genql';
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
		| 'voter_name'
		| 'voter_party'
	> & {
		voters: unknown[];
	})[];
}) {
	const errors: VoteIssue[] = [];
	const warnings: VoteIssue[] = [];

	if (
		voteCountKeyMap
			.entries()
			.some(
				([option, key]) =>
					votes.filter((vote) => vote.option === option).length !==
					(summaryHeader[key] ?? 0),
			)
	) {
		errors.push({
			type: 'COUNT_MISMATCHED',
		});
	}

	votes.forEach((vote, i) => {
		if (!vote.id || !vote.vote_order || !vote.badge_number) {
			warnings.push({ type: 'MISSING_INFORMATION', id: vote.id });
		}

		if (vote.voters.length === 0) {
			warnings.push({ type: 'INVALID_VOTER_NAME', id: vote.id });
		}

		if (!standardVoteOptions.includes(vote.option)) {
			errors.push({ type: 'INVALID_OPTION', id: vote.id });
		}

		if (i < votes.length - 1) {
			const voteWithDuplicatedVoters = votes
				.slice(i + 1)
				.filter(
					(otherVote) =>
						otherVote.voter_name === vote.voter_name &&
						errors.some(
							(error) =>
								error.type === 'DUPLICATED' && error.id !== otherVote.id,
						),
				);

			if (voteWithDuplicatedVoters.length > 0) {
				errors.push(
					...voteWithDuplicatedVoters.map((dupVote) => ({
						type: 'DUPLICATED' as VoteIssueType,
						id: dupVote.id,
					})),
				);
			}
		}
	});

	return { errors, warnings };
}
