<script setup lang="ts">
// @ts-expect-error carbon icons vue type
import { TrashCan16 } from '@carbon/icons-vue';
import type {
	DeletableEntity,
	DeletionSummary,
} from '~/composables/use-entity-deletion';

const props = defineProps<{
	entity: DeletableEntity;
	id: string;
	name?: string | null;
}>();

const { fetchSummary, deleteEntity } = useEntityDeletion(props.entity);
const toast = useToastNotification();

const isOpen = ref(false);
const isDeleting = ref(false);
const summary = ref<DeletionSummary | null>(null);

const deletedItems = computed(
	() => summary.value?.deleted.filter((item) => item.count > 0) ?? [],
);
const unlinkedItems = computed(
	() => summary.value?.unlinked.filter((item) => item.count > 0) ?? [],
);

const showError = (title: string, error: unknown) => {
	console.error(title, error);
	isOpen.value = false;
	toast.show({
		kind: 'warning',
		title,
		subTitle: 'กรุณาลองใหม่อีกครั้ง',
	});
};

const open = async () => {
	summary.value = null;
	isOpen.value = true;
	try {
		summary.value = await fetchSummary(props.id);
	} catch (error) {
		showError('ไม่สามารถโหลดข้อมูลที่เกี่ยวข้องได้', error);
	}
};

const close = () => {
	if (!isDeleting.value) isOpen.value = false;
};

const confirm = async () => {
	isDeleting.value = true;
	try {
		await deleteEntity(props.id);
		await navigateTo(ENTITY_LIST_PATH[props.entity]);
	} catch (error) {
		showError('เกิดข้อผิดพลาดในการลบข้อมูล', error);
	} finally {
		isDeleting.value = false;
	}
};
</script>

<template>
	<div>
		<cv-button
			data-testid="delete-entity-button"
			kind="danger--ghost"
			:icon="TrashCan16"
			@click="open"
		>
			Delete
		</cv-button>

		<cv-modal
			class="delete-entity-modal"
			:visible="isOpen"
			kind="danger"
			size="sm"
			:primary-button-disabled="!summary || isDeleting"
			auto-hide-off
			@primary-click="confirm"
			@secondary-click="close"
			@modal-hide-request="close"
		>
			<template #title>Delete this {{ ENTITY_LABEL[entity] }}?</template>

			<template #content>
				<cv-inline-loading
					v-if="!summary"
					state="loading"
					loading-text="Checking related nodes..."
				/>
				<div v-else class="flex flex-col gap-4">
					<p class="p-0">This will permanently delete "{{ name }}".</p>

					<template v-if="deletedItems.length">
						<p class="p-0">Also deleted related nodes:</p>
						<ul class="list-disc pl-6">
							<li v-for="item in deletedItems" :key="item.label">
								{{ item.count.toLocaleString() }} {{ item.label }}
							</li>
						</ul>
					</template>

					<template v-if="unlinkedItems.length">
						<p class="p-0">Kept nodes but unlinked:</p>
						<ul class="list-disc pl-6">
							<li v-for="item in unlinkedItems" :key="item.label">
								{{ item.count.toLocaleString() }} {{ item.label }}
							</li>
						</ul>
					</template>

					<p class="p-0 font-bold">This action cannot be undone.</p>
				</div>
			</template>

			<template #secondary-button>Cancel</template>
			<template #primary-button>
				{{ isDeleting ? 'Deleting...' : 'Delete' }}
			</template>
		</cv-modal>

		<FeedbackToast :notification="toast.notification" @close="toast.hide" />
	</div>
</template>
