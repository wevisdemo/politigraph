<script lang="ts" setup>
defineProps<{
	visible: boolean;
	membershipName: string | null;
}>();

const emit = defineEmits<{
	'update:visible': [value: boolean];
	confirm: [];
}>();

const handleCancel = () => {
	emit('update:visible', false);
};
</script>

<template>
	<cv-modal
		class="delete-membership-modal"
		:visible="visible"
		kind="danger"
		size="sm"
		@primary-click="emit('confirm')"
		@secondary-click="handleCancel"
		@modal-hide-request="handleCancel"
	>
		<template #title> Delete Membership </template>

		<template #content>
			<p class="p-0">
				Are you sure you want to remove a membership of "{{ membershipName }}"?
			</p>
		</template>

		<template #secondary-button> Cancel </template>
		<template #primary-button> Delete </template>
	</cv-modal>
</template>

<style>
.delete-membership-modal .bx--modal-content {
	overflow: hidden;
}
</style>
