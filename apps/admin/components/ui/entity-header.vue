<script setup lang="ts">
import { DocumentView16, Save16, View16, ViewOff16 } from '@carbon/icons-vue';
import type { PublishStatus } from '@politigraph/graphql/genql';
import type { DeletableEntity } from '~/composables/use-entity-deletion';
import type { FunctionalComponent } from 'vue';

const props = defineProps<{
	title?: string;
	entity?: DeletableEntity;
	entityId?: string;
	publishStatus?: PublishStatus;
	originalDocumentUrl?: string;
	isPublishingDisabled?: boolean;
	isSaveDisabled?: boolean;
	saveLabel?: string;
	saveIcon?: FunctionalComponent;
}>();

defineEmits(['togglePublishStatus', 'save']);

const status = computed(() => props.publishStatus ?? 'PUBLISHED');
const isPublished = computed(() => status.value === 'PUBLISHED');
const save = computed(() => ({
	label: props.saveLabel ?? 'Save Changes',
	icon: props.saveIcon ?? Save16,
}));
</script>

<template>
	<cv-skeleton-text v-if="!title" class="my-6" heading :line-count="2" />
	<div v-else class="my-4 flex flex-col gap-4">
		<div class="flex flex-row items-center gap-2">
			<PublishStatusTag class="mr-auto" :status="status" />

			<UiDeleteEntityButton
				v-if="entity && entityId"
				:id="entityId"
				:entity="entity"
				:name="title"
			/>
			<a
				v-if="originalDocumentUrl"
				:href="originalDocumentUrl"
				rel="noopener noreferrer"
				target="_blank"
			>
				<cv-button :icon="DocumentView16" kind="ghost">
					View Original
				</cv-button>
			</a>
			<cv-button
				v-if="publishStatus"
				default="Unpublished"
				:icon="isPublished ? ViewOff16 : View16"
				kind="tertiary"
				:disabled="isPublishingDisabled"
				@click="$emit('togglePublishStatus')"
			>
				{{ isPublished ? 'Unpublished' : 'Published' }}
			</cv-button>
			<cv-button
				:default="save.label"
				:icon="save.icon"
				:disabled="isSaveDisabled"
				type="submit"
				@click="$emit('save')"
			>
				{{ save.label }}
			</cv-button>
		</div>
		<h1 class="md:min-w-xl font-normal">
			{{ title }}
		</h1>
	</div>

	<cv-inline-notification
		v-if="!isPublished"
		low-contrast
		kind="warning"
		title="This item is unpublished"
		sub-title="It is not visible in public view."
		hide-close-button
	/>
</template>
