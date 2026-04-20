<script setup lang="ts">
// @ts-ignore
import { UserFilled32 } from '@carbon/icons-vue';
import type { FileItem } from '~/composables/use-image-upload';
import type { Component } from 'vue';

const props = withDefaults(
	defineProps<{
		imageUrl?: string | null;
		placeholderIcon?: Component;
	}>(),
	{
		placeholderIcon: UserFilled32,
	},
);

const images = defineModel<FileItem[]>({ default: [] });
</script>

<template>
	<div class="flex flex-row gap-4">
		<div
			class="flex size-32 flex-none items-center justify-center rounded-full border border-gray-400 bg-[#F4F4F4]"
		>
			<img
				v-if="imageUrl"
				:src="imageUrl"
				class="size-32 rounded-full object-cover"
			/>
			<component :is="placeholderIcon" v-else class="size-12 text-[#A8A8A8]" />
		</div>
		<cv-file-uploader
			v-model="images"
			accept=".jpg,.png,.webp"
			:multiple="false"
			label="Image"
			helperText="อัปโหลดรูปภาพ"
			removable
		>
		</cv-file-uploader>
	</div>
</template>
