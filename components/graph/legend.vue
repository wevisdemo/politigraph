<script setup lang="ts">
defineProps<{
	term: string;
	definition: string;
	borderColor?: string;
	backgroundColor?: string;
	dashed?: boolean;
}>();
</script>

<template>
	<div class="flex flex-row gap-1">
		<div
			class="size-4 rounded border"
			:style="{
				borderColor,
				backgroundColor,
				borderStyle: dashed ? 'dashed' : 'solid',
			}"
		></div>
		<cv-definition-tooltip :term :definition />
	</div>
</template>
