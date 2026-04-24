<script setup lang="ts">
interface BillMergeEventForm {
	id: string;
	main_bill_id?: string | null;
	bills?: {
		id: string;
		title?: string | null;
		creators?: ({ id: string; name: string } | null)[];
		links?: { note: string; url: string }[];
	}[];
}

const props = defineProps<{
	event: BillMergeEventForm;
	currentBillId: string;
}>();

const sortedBills = computed(() => {
	if (!props.event.bills) return [];
	return [...props.event.bills].sort((a, b) => {
		if (a.id === props.currentBillId) return -1;
		if (b.id === props.currentBillId) return 1;
		return 0;
	});
});

const emit = defineEmits<{
	update: [key: string, value: unknown];
}>();
</script>

<template>
	<div class="flex flex-col gap-4">
		<cv-radio-group
			:legendText="`Select main bill from ${event.bills?.length ?? 0} merged bills`"
			vertical
		>
			<radio-input-with-details
				v-for="bill in sortedBills"
				:key="bill.id"
				:value="bill.id"
				:name="`merge-bill-${event.id}`"
				:model-value="event.main_bill_id ?? ''"
				@update:model-value="(value) => emit('update', 'main_bill_id', value)"
			>
				<span>
					{{ bill.id === currentBillId ? '[ร่างนี้] ' : ''
					}}{{ bill.title ?? bill.id }}
				</span>
				<span v-if="bill.creators?.[0]?.name" class="text-sm text-neutral-500">
					เสนอโดย {{ bill.creators[0].name }}
				</span>
				<span class="flex flex-wrap gap-x-1 text-sm text-neutral-500">
					<a
						v-if="bill.id !== currentBillId"
						:href="`/admin/bills/${bill.id}`"
						target="_blank"
						class="underline hover:text-neutral-700"
					>
						ดูบน Admin
					</a>
					<template v-if="bill.id !== currentBillId && bill.links?.length"
						>,
					</template>
					<template v-for="(link, linkIndex) in bill.links" :key="link.url">
						<a
							:href="link.url"
							target="_blank"
							class="underline hover:text-neutral-700"
						>
							{{ link.note }}
						</a>
						<template v-if="linkIndex < (bill.links?.length ?? 0) - 1"
							>,
						</template>
					</template>
				</span>
			</radio-input-with-details>
		</cv-radio-group>
	</div>
</template>
