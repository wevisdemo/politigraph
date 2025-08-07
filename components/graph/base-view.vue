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
		class="flex flex-col justify-end bg-gray-100 md:flex-row"
		:class="
			isMaximized
				? 'fixed inset-0 z-10'
				: 'relative rounded-lg border border-gray-200'
		"
	>
		<div
			class="relative flex min-h-80 flex-col overflow-y-scroll rounded-tl-lg md:flex-1"
		>
			<slot />
			<div class="absolute top-0 left-0 flex flex-row rounded-br bg-gray-200">
				<cv-icon-button
					size="small"
					kind="ghost"
					tipAlignment="start"
					:label="isMaximized ? 'Minimize' : 'Maximize'"
					:icon="isMaximized ? Minimize16 : Maximize16"
					@click="toggleMaximize"
				/>
				<slot name="control" />
			</div>
			<div
				class="absolute bottom-0 left-0 flex flex-row gap-2 rounded-tr rounded-bl-lg bg-gray-200 p-1 text-xs text-gray-700"
			>
				<slot name="legend" />
			</div>
		</div>
		<div
			class="flex flex-col gap-3 overflow-y-scroll bg-gray-800 text-white"
			:class="isMaximized ? 'flex-1 p-6' : 'rounded-lg p-3 md:h-128 md:w-84'"
		>
			<slot name="sidebar" />
		</div>
	</div>
</template>
