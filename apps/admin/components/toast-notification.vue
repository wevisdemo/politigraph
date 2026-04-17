<script setup lang="ts">
import type { ToastNotificationState } from '~/composables/toast-notification';

defineProps<{
	notification: Ref<ToastNotificationState | null>;
}>();

defineEmits<{
	(e: 'close'): void;
}>();
</script>

<template>
	<cv-toast-notification
		v-if="notification.value"
		class="fixed bottom-2 right-1 z-50"
		v-bind="notification.value"
		@close="$emit('close')"
	/>
</template>
