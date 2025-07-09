<script setup lang="ts">
//@ts-ignore
import { CheckmarkFilled16, WarningFilled16 } from '@carbon/icons-vue';
import type { Vote, VoteEvent } from '~/.genql';
import { standardVoteOptions, voteCountKeyMap } from '~/constants/votes';

type VoteEventProp = Pick<
	VoteEvent,
	| 'publish_status'
	| 'agree_count'
	| 'disagree_count'
	| 'novote_count'
	| 'abstain_count'
> & {
	votes: Pick<Vote, 'option'>[];
};

const props = defineProps<{
	voteEvent: VoteEventProp | null;
}>();

const options = computed(() => [
	...standardVoteOptions.map((option) => ({
		option,
		headingCountKey: voteCountKeyMap.get(option),
		tableCount: props.voteEvent?.votes.filter((v) => v.option === option)
			.length,
	})),
	{
		option: 'อื่นๆ',
		headingCountKey: undefined,
		tableCount: props.voteEvent?.votes.filter(
			(v) => !standardVoteOptions.includes(v.option),
		).length,
	},
]);
</script>

<template>
	<div class="flex flex-col gap-4 bg-white p-4">
		<h4>Vote Summary</h4>
		<p class="text-sm">
			ข้อมูลสรุปผลคะแนนที่ OCR จากหัวเอกสารบันทึกผลการลงมติ
			โดยระบบจะใช้ผลคะแนนนี้ในการตรวจสอบข้อมูลการลงมติ (Votes)
			ว่าถูกต้องตรงกันหรือไม่ กับผลรวมที่สรุปจากตาราง
		</p>
		<div class="grid grid-cols-3 gap-3">
			<div></div>
			<strong>สรุปจากหัวเอกสาร</strong>
			<strong class="pr-4">สรุปจากตาราง</strong>

			<template v-for="{ option, headingCountKey, tableCount } in options">
				<div class="h-[40px]">
					{{ option }}
				</div>
				<div>
					<cv-skeleton-text v-if="!voteEvent" heading />
					<cv-number-input
						v-else-if="headingCountKey"
						class="min-w-0 pr-2"
						:modelValue="voteEvent[headingCountKey] ?? 0"
						@update:modelValue="
							(value: string) => {
								// @ts-ignore
								voteEvent[headingCountKey] = value;
							}
						"
					></cv-number-input>
					<span v-else>-</span>
				</div>
				<div class="flex flex-row gap-1">
					<span class="flex-1">{{ tableCount }}</span>
					<template v-if="voteEvent && headingCountKey">
						<CheckmarkFilled16
							v-if="tableCount === (voteEvent[headingCountKey] ?? 0)"
							class="text-green-600"
						/>
						<WarningFilled16 v-else class="text-red-600" />
					</template>
				</div>
			</template>

			<div class="h-[40px] font-bold">รวม</div>
			<div>-</div>
			<div>
				{{ options.reduce((acc, option) => acc + (option.tableCount ?? 0), 0) }}
			</div>
		</div>
	</div>
</template>

<style scoped>
.grid div {
	@apply flex items-center;
}

::v-deep(.bx--number__controls) {
	display: none;
}
</style>
