<script setup lang="ts">
// @ts-ignore
import { UserFilled32 } from '@carbon/icons-vue';
import { enumGender, type Gender, type Link } from '@politigraph/graphql/genql';
import LinksForm from '~/components/LinksForm.vue';
import { formatDate, parseDate } from '~/utils/date';

export interface PeopleDetailProps {
	id: string;
	name: string;
	name_en?: string | null;
	prefix?: string | null;
	firstname?: string | null;
	middlename?: string | null;
	lastname?: string | null;
	firstname_en?: string | null;
	middlename_en?: string | null;
	lastname_en?: string | null;
	gender?: Gender | null;
	birth_date?: string | null;
	educations?: string | null;
	previous_occupations?: string | null;
	image?: string | null;
	links?: Pick<Link, 'id' | 'url' | 'note'>[] | null;
}

const modelValue = defineModel<PeopleDetailProps | null>();

const birthDateLocal = ref<Date | null>(
	parseDate(modelValue.value?.birth_date ?? null),
);

watch(birthDateLocal, (val) => {
	if (!modelValue.value) return;
	modelValue.value.birth_date = formatDate(val);
});

watch(
	() => modelValue.value?.birth_date,
	(val) => {
		birthDateLocal.value = parseDate(val ?? null);
	},
);

const genderOptions = Object.values(enumGender);
</script>

<template>
	<div class="h-fit space-y-4 bg-white p-4">
		<h4 class="pt-2">Person Details</h4>
		<template v-if="!modelValue">
			<cv-number-input-skeleton v-for="i in 9" :key="i" />
		</template>
		<template v-else>
			<div
				class="flex h-[128px] w-[128px] flex-none items-center justify-center rounded-full border border-gray-400 bg-[#F4F4F4]"
			>
				<img
					v-if="modelValue.image"
					:src="modelValue.image"
					class="h-[128px] w-[128px] rounded-full object-cover"
				/>
				<UserFilled32
					v-else
					class="text-[#A8A8A8]"
					style="width: 48px; height: 48px"
				/>
			</div>
			<cv-text-input
				v-model="modelValue.prefix"
				label="Title*"
				placeholder=""
				required
				class="w-fit"
			/>
			<div class="flex gap-6">
				<cv-text-input
					v-model="modelValue.firstname"
					label="Firstname (Thai)*"
					placeholder=""
					required
				/>
				<cv-text-input
					v-model="modelValue.middlename"
					label="Middlename (Thai)"
					placeholder=""
				/>
				<cv-text-input
					v-model="modelValue.lastname"
					label="Lastname (Thai)*"
					placeholder=""
					required
				/>
			</div>
			<div class="flex gap-6">
				<cv-text-input
					v-model="modelValue.firstname_en"
					label="Firstname (Eng)"
					placeholder=""
					required
				/>
				<cv-text-input
					v-model="modelValue.middlename_en"
					label="Middlename (Eng)"
					placeholder=""
				/>
				<cv-text-input
					v-model="modelValue.lastname_en"
					label="Lastname (Eng)"
					placeholder=""
					required
				/>
			</div>
			<cv-dropdown
				:placeholder="modelValue.gender"
				v-model="modelValue.gender"
				label="Sex"
				class="w-fit"
			>
				<cv-dropdown-item
					v-for="item in genderOptions"
					:key="item"
					:value="item"
				>
					{{ item }}
				</cv-dropdown-item>
			</cv-dropdown>
			<cv-date-picker
				v-model="birthDateLocal"
				dateLabel="ฺBirthdate (yyyy/mm/dd)"
				placeholder=""
				kind="single"
			/>
			<cv-text-area
				v-model="modelValue.educations"
				label="Education"
				placeholder=""
				rows="6"
			/>
			<cv-text-area
				v-model="modelValue.previous_occupations"
				label="Previous Occupations"
				placeholder=""
				rows="6"
			/>
			<template
				class="flex flex-col gap-8"
				v-if="modelValue && modelValue.links"
			>
				<h6>Social Media</h6>
				<LinksForm v-model:links="modelValue.links" />
			</template>
		</template>
	</div>
</template>
