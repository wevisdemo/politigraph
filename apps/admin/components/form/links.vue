<script setup lang="ts">
// @ts-expect-error carbon icons vue type
import { Launch16, TrashCan16 } from '@carbon/icons-vue';
import type { Link } from '@politigraph/graphql/genql';
import { watch } from 'vue';

type LinkItem = Pick<Link, 'id' | 'note' | 'url'>;

const props = defineProps<{ links: LinkItem[] }>();
const emit = defineEmits<{ (e: 'update:links', value: LinkItem[]): void }>();
const localLinks = ref<LinkItem[]>([...props.links]);

watch(
	localLinks,
	(newVal) => {
		emit('update:links', [...newVal]);
	},
	{ deep: true },
);

const addLink = () => {
	localLinks.value = [...localLinks.value, { id: '', note: '', url: '' }];
};

const removeLink = (index: number) => {
	localLinks.value = localLinks.value.filter((_, i) => i !== index);
};

const updateLink = (index: number, key: 'note' | 'url', value: string) => {
	localLinks.value[index][key] = value ?? '';
};
</script>
<template>
	<div
		v-for="(link, i) in localLinks"
		:key="link.id || i"
		class="flex flex-col gap-3"
	>
		<div class="flex flex-row items-center justify-between">
			<h6>{{ `Link ${i + 1}` }}</h6>
			<div class="flex flex-row items-center">
				<a
					v-if="link.url"
					:href="link.url"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex min-h-12 items-center gap-2 bg-transparent px-4 text-[0.875rem] leading-[1.28572] text-[#0f62fe] no-underline hover:bg-[#e5e5e5] hover:text-[#0043ce]"
				>
					Open <Launch16 />
				</a>
				<cv-button
					kind="danger--ghost"
					:icon="TrashCan16"
					@click="removeLink(i)"
				>
					Delete
				</cv-button>
			</div>
		</div>
		<cv-text-input
			label="Notes"
			:model-value="link.note"
			@update:model-value="(val: string) => updateLink(i, 'note', val)"
		/>
		<cv-text-input
			label="URL"
			:model-value="link.url"
			@update:model-value="(val: string) => updateLink(i, 'url', val)"
		/>
	</div>
	<cv-button
		class="mt-3"
		default="Add Another Item"
		kind="tertiary"
		@click="addLink"
	>
		Add a link
	</cv-button>
</template>
