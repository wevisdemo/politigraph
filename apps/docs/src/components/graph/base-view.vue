<script setup lang="ts">
// @ts-ignore
import { Maximize16, Minimize16 } from '@carbon/icons-vue';
import { computed, nextTick, ref } from 'vue';

const props = defineProps<{
	fit?: () => void;
	isSidebarEmpty?: boolean;
	fillHeight?: boolean;
	immersive?: boolean;
}>();

const isMaximized = ref(false);

const sizeClass = computed(() => {
	if (isMaximized.value) return 'fixed inset-0 z-20';
	if (props.immersive) return 'h-full w-full';
	if (props.fillHeight) return 'md:h-[max(32rem,calc(100vh-22rem))]';
	return 'md:h-128';
});

async function toggleMaximize() {
	isMaximized.value = !isMaximized.value;
	await nextTick();
	props.fit?.();
}
</script>

<template>
	<Teleport to="body" :disabled="!isMaximized">
		<div
			class="flex flex-col bg-gray-100 md:flex-row dark:bg-gray-900"
			:class="sizeClass"
		>
			<div class="relative flex min-h-80 flex-1 flex-col overflow-hidden">
				<slot />
				<slot name="overlay" />
				<div
					class="absolute bottom-0 left-0 flex max-w-full flex-row gap-2 overflow-x-auto rounded-tr bg-gray-200 p-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
				>
					<slot name="legend" />
				</div>
				<button
					v-if="!immersive"
					class="bottom absolute left-0 top-0 m-0 flex size-6 cursor-pointer items-center justify-center rounded-br bg-gray-200 text-gray-700 hover:text-black dark:bg-gray-800 dark:text-gray-300 dark:hover:text-white"
					@click="toggleMaximize"
					:aria-label="isMaximized ? 'Minimize' : 'Maximize'"
				>
					<Minimize16 v-if="isMaximized" />
					<Maximize16 v-else />
				</button>
			</div>
			<div
				class="mt-0 flex h-full max-h-64 flex-col gap-3 overflow-y-scroll bg-gray-200 p-3 text-black md:max-h-none dark:bg-gray-800 dark:text-white"
				:class="isMaximized || immersive ? 'md:w-96' : 'md:w-64'"
			>
				<slot name="sidebar" />
			</div>
		</div>
	</Teleport>
</template>
