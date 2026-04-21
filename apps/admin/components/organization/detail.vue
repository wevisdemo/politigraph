<script setup lang="ts">
// @ts-ignore
import { Enterprise32 } from '@carbon/icons-vue';
import {
	enumOrganizationType,
	type Link,
	type Organization,
	type OrganizationType,
} from '@politigraph/graphql/genql';
import { organizationTypeLabel } from '~/constants/organization';
import { parseDate, serializeDate } from '~/utils/date';
import PickColors from 'vue-pick-colors';

type OrganizationOption = {
	label: string;
	value: string;
};

export interface OrganizationDetailProps extends Pick<
	Organization,
	| 'id'
	| 'name'
	| 'name_en'
	| 'description'
	| 'classification'
	| 'founding_date'
	| 'dissolution_date'
	| 'color'
	| 'image'
> {
	links: Pick<Link, 'id' | 'note' | 'url'>[];
}

const modelValue = defineModel<OrganizationDetailProps | null>();
const selectedParentIds = defineModel<string[]>('selectedParentIds');
const selectedChildIds = defineModel<string[]>('selectedChildIds');

const props = defineProps<{
	organizationOptions: OrganizationOption[] | null;
	previewImage?: string | null;
}>();

defineEmits<{
	(e: 'crop', blob: Blob): void;
}>();

const getSelectedOrganizationLabels = (ids: string[] | undefined) =>
	(ids ?? [])
		.map(
			(id) =>
				props.organizationOptions?.find((option) => option.value === id)
					?.label ?? id,
		)
		.join(', ');

const selectedParentLabels = computed(() =>
	getSelectedOrganizationLabels(selectedParentIds.value),
);

const selectedChildLabels = computed(() =>
	getSelectedOrganizationLabels(selectedChildIds.value),
);

const organizationColor = computed<string>({
	get: () => modelValue.value?.color ?? '',
	set: (value) => {
		if (!modelValue.value) return;
		modelValue.value.color = value || null;
	},
});

const foundingDateLocal = ref<Date | null>(
	parseDate(modelValue.value?.founding_date ?? null),
);
const dissolutionDateLocal = ref<Date | null>(
	parseDate(modelValue.value?.dissolution_date ?? null),
);

watch(foundingDateLocal, (val) => {
	if (!modelValue.value) return;
	modelValue.value.founding_date = serializeDate(val);
});

watch(dissolutionDateLocal, (val) => {
	if (!modelValue.value) return;
	modelValue.value.dissolution_date = serializeDate(val);
});

watch(
	() => modelValue.value?.founding_date,
	(val) => {
		foundingDateLocal.value = parseDate(val ?? null);
	},
);

watch(
	() => modelValue.value?.dissolution_date,
	(val) => {
		dissolutionDateLocal.value = parseDate(val ?? null);
	},
);

const organizationTypeOptions = Object.values(enumOrganizationType).map(
	(item) => ({
		label: organizationTypeLabel[item] ?? item,
		value: item,
	}),
);
</script>

<template>
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-1">
			<h4>Organization Details</h4>
			<p class="text-xs opacity-70">ID: {{ modelValue?.id }}</p>
		</div>

		<template v-if="!modelValue || !props.organizationOptions">
			<cv-text-input-skeleton />
			<cv-text-input-skeleton />
			<cv-text-input-skeleton />
			<cv-text-input-skeleton />
			<cv-text-input-skeleton />
			<cv-text-area-skeleton />
			<cv-text-input-skeleton />
			<cv-text-input-skeleton />
			<cv-text-input-skeleton />
		</template>

		<template v-else>
			<UploadedImageDisplay
				:image-url="previewImage || modelValue?.image"
				:placeholder-icon="Enterprise32"
				:cropperSize="
					({ imageSize }) => {
						const size = Math.min(imageSize.width, imageSize.height);
						return {
							width: size,
							height: size,
						};
					}
				"
				:cropperPosition="
					({ imageSize }) => {
						const size = Math.min(imageSize.width, imageSize.height);
						return {
							left: (imageSize.width - size) / 2,
							top: (imageSize.height - size) / 2,
						};
					}
				"
				@crop="$emit('crop', $event)"
			/>

			<div class="flex items-center gap-3 text-[#525252]">
				<p class="text-xs font-medium">Color</p>
				<PickColors
					v-model:value="organizationColor"
					format="hex"
					:colors="[]"
				/>
				<span class="font-mono text-sm">
					{{ organizationColor || '-' }}
				</span>
			</div>

			<cv-text-input
				v-model="modelValue.name"
				label="Name*"
				placeholder=""
				required
			/>

			<cv-text-input
				v-model="modelValue.name_en"
				label="Name (Eng)"
				placeholder=""
			/>

			<cv-text-area
				v-model="modelValue.description"
				label="Description"
				placeholder=""
				rows="5"
			/>

			<cv-select
				label="Classification*"
				:modelValue="modelValue.classification"
				@update:modelValue="
					(value) => {
						if (!modelValue) return;
						modelValue.classification = value as OrganizationType;
					}
				"
			>
				<cv-select-option
					v-for="item in organizationTypeOptions"
					:key="item.value"
					:value="item.value"
				>
					{{ item.label }}
				</cv-select-option>
			</cv-select>

			<div class="flex flex-row">
				<cv-date-picker
					v-model="foundingDateLocal"
					dateLabel="Founding Date"
					kind="single"
					:calOptions="{ dateFormat: 'Y-m-d' }"
				/>

				<cv-date-picker
					v-model="dissolutionDateLocal"
					dateLabel="Dissolution Date"
					kind="single"
					:calOptions="{ dateFormat: 'Y-m-d' }"
				/>
			</div>

			<cv-multi-select
				title="Parents"
				:label="selectedParentLabels"
				:options="organizationOptions"
				v-model="selectedParentIds"
			/>

			<cv-multi-select
				title="Children"
				:label="selectedChildLabels"
				:options="organizationOptions"
				v-model="selectedChildIds"
			/>

			<div>
				<h4 class="mb-3">References</h4>
				<LinksForm v-model:links="modelValue.links" />
			</div>
		</template>
	</div>
</template>
