<script setup lang="ts">
// @ts-ignore
import { ChevronLeft16, ChevronRight16 } from '@carbon/icons-vue';
import { type VNetworkGraphInstance } from 'v-network-graph';
import { ref } from 'vue';

const props = defineProps<{
	graphElement?: VNetworkGraphInstance;
	isSidebarEmpty?: boolean;
}>();

const isMaximized = ref(false);

function toggleMaximize() {
	isMaximized.value = !isMaximized.value;

	props.graphElement?.fitToContents();
	props.graphElement?.panToCenter();
}
</script>

<template>
	<div class="md:h-128 flex flex-col justify-end bg-gray-100 md:flex-row">
		<div class="relative flex min-h-80 flex-col overflow-y-scroll md:flex-1">
			<slot />
			<div
				class="absolute bottom-0 left-0 flex flex-row gap-2 rounded-tr bg-gray-200 p-1 text-xs text-gray-700"
			>
				<slot name="legend" />
			</div>
			<button
				class="bottom absolute right-0 m-0 rounded-l bg-gray-800 px-0 py-1 text-white"
				@click="toggleMaximize"
				:aria-label="isMaximized ? 'Minimize' : 'Maximize'"
			>
				<ChevronLeft16 v-if="isMaximized" />
				<ChevronRight16 v-else />
			</button>
		</div>
		<div
			class="mt-0 flex h-full flex-col gap-3 overflow-y-scroll bg-gray-800 text-white"
			:class="
				isMaximized
					? 'w-0 overflow-hidden'
					: 'max-h-80 p-3 md:max-h-none md:w-64'
			"
		>
			<slot name="sidebar" />
		</div>
	</div>
</template>
