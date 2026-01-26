<script setup lang="ts">
// @ts-ignore
import { Maximize16, Minimize16 } from '@carbon/icons-vue';
import { type VNetworkGraphInstance } from 'v-network-graph';
import { nextTick, ref } from 'vue';

const props = defineProps<{
	graphElement?: VNetworkGraphInstance;
	isSidebarEmpty?: boolean;
}>();

const isMaximized = ref(false);

function toggleMaximize() {
	isMaximized.value = !isMaximized.value;
	nextTick();
	props.graphElement?.fitToContents();
	props.graphElement?.panToCenter();
}
</script>

<template>
	<Teleport to="body" :disabled="!isMaximized">
		<div
			class="flex flex-col bg-gray-100 md:flex-row"
			:class="isMaximized ? 'fixed inset-0 z-20' : 'md:h-128'"
		>
			<div class="relative flex min-h-80 flex-col overflow-hidden md:flex-1">
				<slot />
				<div
					class="absolute bottom-0 left-0 flex flex-row gap-2 rounded-tr bg-gray-200 p-1 text-xs text-gray-700"
				>
					<slot name="legend" />
				</div>
				<button
					class="bottom absolute left-0 top-0 m-0 flex size-6 cursor-pointer items-center justify-center rounded-br bg-gray-200 text-gray-700 hover:text-black"
					@click="toggleMaximize"
					:aria-label="isMaximized ? 'Minimize' : 'Maximize'"
				>
					<Minimize16 v-if="isMaximized" />
					<Maximize16 v-else />
				</button>
			</div>
			<div
				class="mt-0 flex h-full max-h-80 flex-col gap-3 overflow-y-scroll bg-gray-800 p-3 text-white md:max-h-none"
				:class="isMaximized ? 'md:w-96' : 'md:w-64'"
			>
				<slot name="sidebar" />
			</div>
		</div>
	</Teleport>
</template>
