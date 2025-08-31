<script setup lang="ts">
// @ts-ignore
import type { PublishStatus } from '~/.genql';
import { enumPublishStatus } from '~/.genql';

defineProps<{
	status: PublishStatus;
}>();
</script>

<template>
	<span
		:class="{
			'text-[#DA1E28]': status === enumPublishStatus.ERROR,
			'text-[#158236]': status === enumPublishStatus.PUBLISHED,
		}"
	>
		{{ status }}
	</span>
</template>
