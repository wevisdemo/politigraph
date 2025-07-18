<script setup lang="ts">
//@ts-ignore
import { Maximize16, Minimize16 } from '@carbon/icons-vue';
import { type VNetworkGraphInstance } from 'v-network-graph';
import 'v-network-graph/lib/style.css';

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
	<div
		class="flex flex-row justify-end bg-gray-100"
		:class="
			isMaximized
				? 'fixed inset-0'
				: 'relative h-128 rounded-lg border border-gray-200'
		"
	>
		<ClientOnly>
			<slot />
		</ClientOnly>
		<cv-icon-button
			class="absolute top-0 left-0"
			size="small"
			kind="ghost"
			tipAlignment="start"
			:label="isMaximized ? 'Minimize' : 'Maximize'"
			:icon="isMaximized ? Minimize16 : Maximize16"
			@click="toggleMaximize"
		/>
		<div
			class="absolute bottom-2 left-2 flex flex-row gap-2 text-xs text-gray-700"
		>
			<slot name="legend" />
		</div>
		<div
			class="flex flex-col gap-4 overflow-y-scroll bg-gray-800 text-white"
			:class="isMaximized ? 'w-128 p-6' : 'w-84 rounded-r-lg p-3'"
		>
			<slot name="sidebar" />
		</div>
	</div>
</template>
