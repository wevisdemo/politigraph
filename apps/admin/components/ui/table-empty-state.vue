<script setup lang="ts">
defineProps<{
	message?: string;
	colspan?: number;
}>();
</script>

<template>
	<tr data-testid="empty-state">
		<td
			:colspan="colspan"
			class="border-0 bg-white text-center text-sm text-neutral-500"
		>
			{{ message ?? 'No data' }}
		</td>
	</tr>
</template>
