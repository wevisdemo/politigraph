<script setup lang="ts">
import type { PublishStatus } from '~/.genql';

const props = defineProps<{
	status?: PublishStatus;
}>();

const variation = computed(() => {
	switch (props.status) {
		case 'PUBLISHED':
			return {
				label: 'Published',
				background: '#a7f0ba',
				foreground: '#0e6027',
			};
		case 'UNPUBLISHED':
			return {
				label: 'Unpublished',
				background: '#e5e0df',
				foreground: '#000',
			};
		case 'ERROR':
			return { label: 'Error', background: '#FFD7D9', foreground: '#A2191F' };
		default:
			return { label: '', background: '', foreground: '' };
	}
});

const isPublish = computed(() => {
	return props.status === 'PUBLISHED';
});
</script>

<template>
	<div
		class="flex w-fit flex-row items-center gap-2 rounded-full border p-2"
		:style="{
			backgroundColor: variation.background,
			color: variation.foreground,
		}"
	>
		<div
			class="size-4 rounded-full"
			:style="{ backgroundColor: variation.foreground }"
		/>
		<div class="text-[12px] capitalize">
			{{ variation.label }}
		</div>
	</div>
</template>
