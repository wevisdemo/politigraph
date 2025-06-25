<script setup lang="ts">
import {
	DocumentView16,
	Save16,
	View16,
	ViewOff16,
	//@ts-ignore
} from '@carbon/icons-vue';
import type { PublishStatus } from '~/.genql';

const props = defineProps<{
	title?: string;
	publishStatus?: PublishStatus;
	originalDocumentUrl?: string;
	isPublishingDisabled?: boolean;
	isSaveDisabled?: boolean;
}>();

defineEmits(['togglePublishStatus', 'save']);

const isPublished = computed(() => props.publishStatus === 'PUBLISHED');

const openOriginalDocument = computed(() =>
	props.originalDocumentUrl
		? () => window.open(props.originalDocumentUrl, '_blank')
		: undefined,
);
</script>

<template>
	<cv-skeleton-text
		v-if="!title"
		class="!my-6"
		heading
		:line-count="2"
	></cv-skeleton-text>
	<div
		v-else
		class="flex flex-col md:flex-row flex-wrap justify-end items-end md:items-center gap-4 !my-6"
	>
		<div class="flex-1 flex flex-row gap-4 items-center">
			<h2 class="md:min-w-xl">
				{{ title }}
			</h2>

			<div>
				<UiPublishStatusTag :status="publishStatus" />
			</div>
		</div>

		<div class="flex gap-2">
			<a
				v-if="originalDocumentUrl"
				:href="originalDocumentUrl"
				rel="noopener noreferrer"
			>
				<cv-button :icon="DocumentView16" kind="tertiary">
					View Original
				</cv-button>
			</a>
			<cv-button
				default="Unpublished"
				:icon="isPublished ? ViewOff16 : View16"
				kind="tertiary"
				@click="$emit('togglePublishStatus')"
				:disabled="isPublishingDisabled"
				>{{ isPublished ? 'Unpublished' : 'Published' }}</cv-button
			>

			<cv-button
				default="Save Changes"
				:icon="Save16"
				:disabled="isSaveDisabled"
				type="submit"
				@click="$emit('save')"
				>Save Changes</cv-button
			>
		</div>
	</div>

	<cv-inline-notification
		v-if="!isPublished"
		lowContrast
		kind="warning"
		title="This item is unpublished"
		subTitle="It is not visible in public view."
		hideCloseButton
	/>
</template>
