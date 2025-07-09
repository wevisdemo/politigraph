<script setup lang="ts">
//@ts-ignore
import { Save16, TrashCan16 } from '@carbon/icons-vue';
import { useForm } from '@tanstack/vue-form';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'API Keys | Politigraph Admin',
});

const { apiKey } = useAuthClient();
const createdKey = ref('');

const {
	data: apiKeys,
	status,
	refresh,
} = await useAsyncData(() => apiKey.list(), {
	server: false,
	lazy: true,
});

const Form = useForm({
	defaultValues: {
		name: '',
	},
	onSubmit: async ({ value }) => {
		const { data, error } = await apiKey.create({
			name: value.name,
		});

		if (!error) {
			createdKey.value = data.key;
			value.name = '';
			refresh();
		}
	},
});
</script>

<template>
	<div class="mt-12 flex justify-center p-3">
		<div class="mx-auto w-full max-w-2xl">
			<cv-data-table-skeleton
				v-if="status === 'pending'"
				title="API Keys"
			></cv-data-table-skeleton>
			<div v-else-if="apiKeys?.data" class="flex flex-col gap-4">
				<cv-data-table title="API Keys"
					><template #headings
						><cv-data-table-heading heading="Name" />
						<cv-data-table-heading heading="Created On" /><cv-data-table-heading
							heading="Actions"
					/></template>
					<template #data>
						<cv-data-table-row
							v-for="key in apiKeys.data.sort(
								(a, z) => z.createdAt.getTime() - a.createdAt.getTime(),
							)"
							:key="key.id"
							:value="key.id"
						>
							<cv-data-table-cell> {{ key.name }} </cv-data-table-cell
							><cv-data-table-cell>
								{{ key.createdAt.toLocaleDateString() }} </cv-data-table-cell
							><cv-data-table-cell>
								<cv-icon-button
									@click="
										async () => {
											await apiKey.delete({
												keyId: key.id,
											});
											refresh();
										}
									"
									size="sm"
									label="Delete"
									kind="danger--ghost"
									tipPosition="left"
									:icon="TrashCan16"
								/> </cv-data-table-cell
						></cv-data-table-row>
					</template>
				</cv-data-table>
				<p
					v-if="apiKeys.data.length === 0"
					class="text-center text-sm opacity-50"
				>
					No API keys found
				</p>

				<form
					class="flex flex-row items-end gap-2"
					@submit.prevent.stop="Form.handleSubmit"
				>
					<Form.Field name="name">
						<template v-slot="{ field }">
							<cv-text-input
								label="Create a new key"
								placeholder="Key name"
								:name="field.name"
								:modelValue="field.state.value"
								@update:modelValue="field.handleChange"
							/>
						</template>
					</Form.Field>
					<cv-button :icon="Save16" type="submit"> Create </cv-button>
				</form>
			</div>
		</div>
		<ClientOnly>
			<cv-modal
				:visible="createdKey.length > 0"
				@modal-hidden="createdKey = ''"
				@primary-click="createdKey = ''"
				><template v-slot:title>API Key was created</template>
				<template v-slot:content
					><div class="flex flex-col gap-2 overflow-hidden">
						<p>The key will be shown only once! Keep it in the safe place.</p>
						<cv-code-snippet kind="multiline" light copyFeedback="Copied">{{
							createdKey
						}}</cv-code-snippet>
						<h6>Usage</h6>

						<p>
							Add <span class="text-red-700">x-api-key: KEY_VALUE</span> header
							to the request
						</p>
					</div>
				</template>
				<template v-slot:primary-button>OK</template></cv-modal
			></ClientOnly
		>
	</div>
</template>
