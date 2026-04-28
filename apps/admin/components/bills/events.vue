<script setup lang="ts">
// @ts-ignore
import { CheckmarkFilled16, WarningFilled16 } from '@carbon/icons-vue';
import {
	type BillEnactEvent,
	type BillMergeEvent,
	type BillRejectEvent,
	type BillRoyalAssentEvent,
	type BillVoteEvent,
} from '@politigraph/graphql/genql';
import { eventTypeLabels } from '~/constants/bill-event';
import { publishStatusOptions } from '~/constants/publish-status';
import { voteEventTypes } from '~/constants/vote-event';
import { formatDate } from '~/utils/date';

type RelationalFields =
	| 'organizations'
	| 'organizationsConnection'
	| 'bills'
	| 'billsConnection'
	| 'links'
	| 'linksConnection'
	| 'created_at'
	| 'updated_at'
	| '__isUnion';

type StripRelational<T> = Omit<T, RelationalFields>;

export type BillEventForm =
	| StripRelational<BillEnactEvent>
	| StripRelational<BillMergeEvent>
	| StripRelational<BillRejectEvent>
	| StripRelational<BillRoyalAssentEvent>
	| StripRelational<BillVoteEvent>;

const props = defineProps<{
	currentBillId: string;
	loading?: boolean;
	originalEvents?: BillEventForm[];
}>();

const events = defineModel<BillEventForm[]>({ required: true });

const updateEvent = (index: number, key: string, value: unknown) => {
	events.value = events.value.map((e, i) =>
		i === index ? ({ ...e, [key]: value } as BillEventForm) : e,
	);
};

const hasChanges = (event: BillEventForm): boolean => {
	const original = props.originalEvents?.find((e) => e.id === event.id);
	if (!original) return false;
	return JSON.stringify(original) !== JSON.stringify(event);
};

const isEventComplete = (event: BillEventForm): boolean => {
	if (event.__typename === 'BillMergeEvent') {
		return event.main_bill_id !== null;
	}
	if (event.__typename === 'BillVoteEvent') {
		return event.vote_events !== undefined && event.vote_events.length > 0;
	}
	return true;
};
</script>

<template>
	<div class="flex flex-col gap-4">
		<cv-data-table-skeleton
			v-if="props.loading"
			:columns="3"
			:rows="3"
			expandable
		/>
		<template v-else>
			<cv-data-table
				title="Events"
				helperText="เหตุการณ์ที่เกี่ยวข้องกับร่างกฏหมาย"
				expandable
				hasExpandAll
				zebra="false"
			>
				<template #headings>
					<cv-data-table-heading heading="Name" />
					<cv-data-table-heading heading="Date" />
					<cv-data-table-heading>
						<div class="flex flex-row items-center gap-1">
							Status
							<cv-tooltip alignment="end" direction="bottom">
								<template #content>
									<bills-event-completeness-remark class="ml-2" />
								</template>
							</cv-tooltip>
						</div>
					</cv-data-table-heading>
				</template>
				<template #data>
					<cv-data-table-row
						v-for="(event, index) in events"
						:key="event.id"
						:class="{ 'unsaved-row': hasChanges(event) }"
					>
						<cv-data-table-cell>
							<span class="font-medium">
								{{ eventTypeLabels[event.__typename] ?? event.__typename }}
								<template v-if="event.__typename === 'BillVoteEvent'">
									({{
										voteEventTypes.find((t) => t.value === event.classification)
											?.label ??
										event.classification ??
										'-'
									}})
								</template>
							</span>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<span class="text-sm text-neutral-500">
								{{
									event.start_date && event.end_date
										? event.start_date === event.end_date
											? formatDate(event.start_date)
											: `${formatDate(event.start_date)} - ${formatDate(event.end_date)}`
										: event.start_date
											? formatDate(event.start_date)
											: event.end_date
												? formatDate(event.end_date)
												: '-'
								}}
							</span>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<CheckmarkFilled16
								v-if="isEventComplete(event)"
								class="text-green-600"
							/>
							<WarningFilled16 v-else class="text-red-600" />
						</cv-data-table-cell>
						<template #expandedContent>
							<div class="flex flex-col gap-4">
								<cv-radio-group legendText="Publish Status*">
									<cv-radio-button
										v-for="item in publishStatusOptions"
										:key="item.value"
										:label="item.label"
										:value="item.value"
										:name="`publish-status-${event.id}`"
										v-model="event.publish_status"
									/>
								</cv-radio-group>

								<div class="flex flex-row gap-5">
									<cv-date-picker
										dateLabel="Start Date"
										kind="single"
										:calOptions="{ dateFormat: 'Y-m-d' }"
										:modelValue="event.start_date ?? ''"
										@update:modelValue="
											updateEvent(index, 'start_date', $event || null)
										"
									/>

									<cv-date-picker
										dateLabel="End Date"
										kind="single"
										:calOptions="{ dateFormat: 'Y-m-d' }"
										:modelValue="event.end_date ?? ''"
										@update:modelValue="
											updateEvent(index, 'end_date', $event || null)
										"
									/>
								</div>

								<cv-text-input
									label="Description"
									class="bg-neutral-100"
									:modelValue="event.description ?? ''"
									@update:modelValue="
										updateEvent(index, 'description', $event || null)
									"
								/>

								<!-- BillEnactEvent -->
								<template v-if="event.__typename === 'BillEnactEvent'">
									<cv-text-input
										label="Title"
										:modelValue="event.title ?? ''"
										@update:modelValue="
											updateEvent(index, 'title', $event || null)
										"
									/>
								</template>

								<!-- BillMergeEvent -->
								<template v-if="event.__typename === 'BillMergeEvent'">
									<bills-form-merge-event
										:event="event"
										:current-bill-id="currentBillId"
										:incomplete="!isEventComplete(event)"
										@update="(key, value) => updateEvent(index, key, value)"
									/>
								</template>

								<!-- BillRejectEvent -->
								<template v-if="event.__typename === 'BillRejectEvent'">
									<cv-text-input
										label="Reject Reason"
										:modelValue="event.reject_reason"
										@update:modelValue="
											updateEvent(index, 'reject_reason', $event)
										"
									/>
								</template>

								<!-- BillRoyalAssentEvent -->
								<template v-if="event.__typename === 'BillRoyalAssentEvent'">
									<cv-text-input
										label="Result"
										:modelValue="event.result ?? ''"
										@update:modelValue="
											updateEvent(index, 'result', $event || null)
										"
									/>
								</template>

								<!-- BillVoteEvent -->
								<template v-if="event.__typename === 'BillVoteEvent'">
									<bills-form-vote-event
										:event="event"
										:incomplete="!isEventComplete(event)"
										@update="(key, value) => updateEvent(index, key, value)"
									/>
								</template>
							</div>
						</template>
					</cv-data-table-row>
					<template v-if="!events.length">
						<tr></tr>
						<tr>
							<td
								colspan="4"
								class="border-0 bg-white text-center text-sm text-neutral-500"
							>
								No events
							</td>
						</tr>
						<tr></tr>
					</template>
				</template>
			</cv-data-table>
		</template>
	</div>
</template>

<style scoped>
::v-deep(.bx--data-table tbody tr:not(.unsaved-row):hover),
::v-deep(.bx--data-table tbody tr:not(.unsaved-row):hover td) {
	background-color: transparent !important;
}

::v-deep(.bx--data-table tbody tr.bx--expandable-row),
::v-deep(.bx--data-table tbody tr.bx--expandable-row td) {
	background-color: transparent !important;
}

::v-deep(.unsaved-row) td {
	background-color: #fff8e1 !important;
}
</style>
