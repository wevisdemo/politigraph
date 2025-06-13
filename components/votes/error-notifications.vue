<script lang="ts" setup>
import type { VoteError, VoteErrorType } from '~/utils/votes/validator';
import { group } from 'radash';

const props = defineProps<{
	errors: VoteError[];
	getActionLabel: (type: VoteErrorType, ids: string[]) => string | undefined;
}>();

defineEmits<{
	(e: 'action', payload: { type: VoteErrorType; ids: string[] }): void;
}>();

const errorGroups = computed(() =>
	Object.entries(group(props.errors, (e) => e.type)).map(([type, records]) => {
		const ids = records
			.map((record) => record.id)
			.filter((id) => id !== undefined);

		return {
			type: type as VoteErrorType,
			title: getErrorTitle(type as VoteErrorType),
			subTitle:
				type === 'COUNT_MISMATCHED'
					? 'the vote summary from document heading is differ from the table.'
					: `${ids.length} records`,
			ids,
		};
	}),
);

function getErrorTitle(type: VoteErrorType): string {
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
			class="mt-0! mb-2! !pr-2"
			v-for="{ type, title, subTitle, ids } in errorGroups"
			lowContrast
			kind="error"
			hideCloseButton
			:title
			:subTitle
			:actionLabel="getActionLabel(type, ids)"
			@action="$emit('action', { type, ids })"
		/>
	</div>
</template>
