<script setup lang="ts">
const props = defineProps({
	status: {
		type: String,
		required: true,
	},
});

const getPublishTitle = (status: string) => {
	switch (status) {
		case 'PUBLISHED':
			return 'Published';
		default:
			return '';
	}
};
</script>

<template>
	<div
		class="flex flex-row gap-2 rounded-full bg-tag-background w-fit !p-2 items-center"
	>
		<div class="rounded-full size-4 bg-tag-icon" />
		<div class="text-[12px] !capitalize">
			{{ getPublishTitle(status) }}
		</div>
	</div>
</template>
