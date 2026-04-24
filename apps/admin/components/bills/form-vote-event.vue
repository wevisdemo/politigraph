<script setup lang="ts">
import type { BillVoteEvent } from '@politigraph/graphql/genql';
import { voteEventTypes } from '~/constants/vote-event';

type BillVoteEventForm = Pick<
	BillVoteEvent,
	'id' | 'classification' | 'title' | 'result' | 'start_date' | 'vote_events'
>;

const props = defineProps<{
	event: BillVoteEventForm;
	incomplete?: boolean;
}>();

const emit = defineEmits<{
	update: [key: string, value: unknown];
}>();

const graphqlClient = useGraphqlClient();

const selectedVoteEventId = computed({
	get: () => props.event.vote_events?.[0]?.id ?? '',
	set: (value) => {
		emit('update', 'vote_events', value ? [{ id: value }] : null);
	},
});

const { data: matchingVoteEvents, refresh } = await useLazyAsyncData(
	`vote-events-for-bill-vote-${props.event.start_date}`,
	async () => {
		if (!props.event.start_date) return [];
		const { voteEvents } = await graphqlClient.query({
			voteEvents: {
				__args: {
					where: {
						start_date: { eq: props.event.start_date },
					},
				},
				id: true,
				title: true,
				classification: true,
				bill_vote_events: {
					bills: {
						id: true,
					},
				},
				links: {
					__args: {
						sort: [{ note: 'ASC' }],
					},
					note: true,
					url: true,
				},
			},
		});
		console.log(voteEvents);
		return voteEvents ?? [];
	},
);

watch(() => props.event.start_date, refresh);
</script>

<template>
	<div class="flex flex-col gap-4 text-sm">
		<div class="flex flex-col gap-2 text-sm">
			<div class="flex gap-1">
				<span class="text-neutral-500">Classification:</span>
				<span>{{
					voteEventTypes.find((t) => t.value === event.classification)?.label ??
					event.classification ??
					'-'
				}}</span>
			</div>
			<div class="flex gap-1">
				<span class="text-neutral-500">Title:</span>
				<span>{{ event.title ?? '-' }}</span>
			</div>

			<div class="flex gap-1">
				<span class="text-neutral-500">Result:</span>
				<span>{{ event.result ?? '-' }}</span>
			</div>
			<cv-radio-group
				legendText="Select matched vote events from the same date"
				:class="{ 'radio-group--incomplete': props.incomplete }"
				vertical
			>
				<radio-input-with-details
					v-for="ve in matchingVoteEvents"
					:key="ve.id"
					:value="ve.id"
					:name="`vote-event-selection-${event.id}`"
					v-model="selectedVoteEventId"
					:disabled="
						(ve.bill_vote_events?.length ?? 0) > 0 &&
						ve.id !== selectedVoteEventId
					"
				>
					<span>{{ ve.title ?? ve.id }}</span>
					<span v-if="ve.classification" class="text-sm text-neutral-500">
						{{
							voteEventTypes.find((t) => t.value === ve.classification)
								?.label ?? ve.classification
						}}
					</span>
					<span class="flex flex-wrap gap-x-1 text-sm text-neutral-500">
						<template
							v-if="
								(ve.bill_vote_events?.length ?? 0) > 0 &&
								ve.id !== selectedVoteEventId
							"
						>
							<a
								:href="`/admin/bills/${ve.bill_vote_events[0].bills[0].id}`"
								target="_blank"
								class="underline hover:text-neutral-700"
							>
								ดูร่างกฏหมายที่เชื่อมกับการลงมตินี้ไปแล้ว
							</a>
						</template>
						<template v-else>
							<a
								:href="`/admin/vote-events/${ve.id}`"
								target="_blank"
								class="underline hover:text-neutral-700"
							>
								ดูบน Admin
							</a>
							<template v-if="ve.links?.length">, </template>
							<template v-for="(link, linkIndex) in ve.links" :key="link.url">
								<a
									:href="link.url"
									target="_blank"
									class="underline hover:text-neutral-700"
								>
									{{ link.note }}
								</a>
								<template v-if="linkIndex < (ve.links?.length ?? 0) - 1"
									>,
								</template>
							</template>
						</template>
					</span>
				</radio-input-with-details>
			</cv-radio-group>
		</div>
	</div>
</template>

<style scoped>
.radio-group--incomplete :deep(.bx--label) {
	color: #da1e28 !important;
}
</style>
