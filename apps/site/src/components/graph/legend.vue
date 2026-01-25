<script setup lang="ts">
import { nodeIconMap } from '../../constants/schema';

defineProps<{
	term: string;
	definition?: string;
	borderColor?: string;
	backgroundColor?: string;
	dashed?: boolean;
	circle?: boolean;
}>();
</script>

<template>
	<div class="mt-0 flex flex-row items-center gap-1">
		<component v-if="nodeIconMap.has(term)" :is="nodeIconMap.get(term)" />
		<div
			v-else
			class="mt-0 size-3 rounded border"
			:class="circle ? 'rounded-full' : 'rounded'"
			:style="{
				borderColor,
				backgroundColor,
				borderStyle: dashed ? 'dashed' : 'solid',
			}"
		></div>
		<span>{{ term }}</span>
	</div>
</template>
