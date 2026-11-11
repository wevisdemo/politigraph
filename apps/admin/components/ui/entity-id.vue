<script setup lang="ts">
const props = defineProps<{ id?: string }>();

const copy = () => props.id && navigator.clipboard.writeText(props.id);
</script>

<template>
	<div class="flex items-center gap-1">
		<p class="text-xs opacity-70">ID: {{ id }}</p>
		<cv-copy-button
			v-if="id"
			class="size-3 bg-transparent hover:bg-[#e5e5e5]"
			icon-description="Copy ID"
			@copy="copy"
		/>
	</div>
</template>
