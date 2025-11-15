<script setup lang="ts">
import type { PublishStatus } from '@politigraph/graphql/genql';
import { enumPublishStatus } from '@politigraph/graphql/genql';

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
