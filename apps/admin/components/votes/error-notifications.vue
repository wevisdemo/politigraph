<script lang="ts" setup>
import type { VoteIssue, VoteIssueType } from '~/utils/votes/validator';
import { group } from 'radash';

const props = defineProps<{
	errors: VoteIssue[];
	warnings: VoteIssue[];
	getActionLabel: (type: VoteIssueType, ids: string[]) => string | undefined;
}>();

defineEmits<{
	(e: 'action', payload: { type: VoteIssueType; ids: string[] }): void;
}>();

const issueGroups = computed(() => [
	...groupResult(props.errors, 'error'),
	...groupResult(props.warnings, 'warning'),
]);

function groupResult(issues: VoteIssue[], kind: string) {
	return Object.entries(group(issues, (e) => e.type)).map(([type, records]) => {
		const ids = records
			.map((record) => record.id)
			.filter((id) => id !== undefined);

		return {
			kind,
			type: type as VoteIssueType,
			title: getErrorTitle(type as VoteIssueType),
			subTitle:
				type === 'COUNT_MISMATCHED'
					? 'the vote summary from document heading is differ from the table.'
					: `${ids.length} records`,
			ids,
		};
	});
}

function getErrorTitle(type: VoteIssueType): string {
	switch (type) {
		case 'COUNT_MISMATCHED':
			return 'Vote Count Mismatch';
		case 'DUPLICATED':
			return 'Duplicate Votes';
		case 'INVALID_OPTION':
			return 'Unexpected Vote Options';
		case 'INVALID_VOTER_NAME':
			return 'Unrecognized Voter Names';
		case 'MISSING_INFORMATION':
			return 'Missing Info';
	}
}
</script>

<template>
	<div class="flex flex-col">
		<cv-inline-notification
			class="mb-2 mt-0 pr-2"
			v-for="{ kind, type, title, subTitle, ids } in issueGroups"
			lowContrast
			hideCloseButton
			:kind
			:title
			:subTitle
			:actionLabel="getActionLabel(type, ids)"
			@action="$emit('action', { type, ids })"
		/>
	</div>
</template>
