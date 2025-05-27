<script setup lang="ts">
import type { PublishStatus } from '~/.genql';

const props = defineProps<{
	status?: PublishStatus;
}>();

const label = computed(() => {
	switch (props.status) {
		case 'PUBLISHED':
			return 'Published';
		case 'UNPUBLISHED':
			return 'Unpublished';
		case 'ERROR':
			return 'Error';
		default:
			return '';
	}
});

const isPublish = computed(() => {
	return props.status === 'PUBLISHED';
});
</script>

<template>
	<div
		:class="`flex flex-row gap-2 rounded-full ${isPublish ? 'bg-tag-background-publish' : 'bg-tag-background'} w-fit !p-2 items-center`"
	>
		<div
			:class="`rounded-full size-4 ${isPublish ? 'bg-tag-icon-publish' : 'bg-tag-icon'}`"
		/>
		<div class="text-[12px] !capitalize">
			{{ label }}
		</div>
	</div>
</template>
