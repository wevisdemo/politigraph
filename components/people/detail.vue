<script setup lang="ts">
// @ts-ignore
import { Add16, TrashCan16 } from '@carbon/icons-vue';
import { enumGender, type Link } from '~/.genql';

interface PeopleDetailProps {
	id: string;
	name: string;
	prefix?: string | null;
	firstname?: string | null;
	middlename?: string | null;
	lastname?: string | null;
	gender?: string | null;
	birth_date?: string | null;
	educations?: string | null;
	image?: string | null;
	links?: Pick<Link, 'url' | 'note'>[] | null;
}

const modelValue = defineModel<PeopleDetailProps | null>();

const genderOptions = Object.values(enumGender);
</script>

<template>
	<div class="h-fit space-y-4 bg-white p-4">
		<h4 class="pt-2">Person Details</h4>
		<template v-if="!modelValue">
			<cv-number-input-skeleton
				v-for="i in 9"
				:key="i"
			></cv-number-input-skeleton>
		</template>
		<template v-else>
			<div class="flex w-full gap-6 2xl:w-3/5">
				<img
					:src="modelValue.image ? modelValue.image : ''"
					alt=""
					class="h-[128px] w-[128px] flex-none rounded-full border border-gray-400 object-cover"
				/>
				<div class="flex flex-col gap-3">
					<span class="font-bold">Profile Image</span>
					<span class="text-[#525252]"
						>Max file size is 500kb. Supported file types are .jpg and
						.png.</span
					>
					<cv-button class="w-fit"> Upload </cv-button>
				</div>
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
					label="Firstname*"
					placeholder=""
					required
				/>
				<cv-text-input
					v-model="modelValue.middlename"
					label="Middlename"
					placeholder=""
				/>
				<cv-text-input
					v-model="modelValue.lastname"
					label="Lastname*"
					placeholder=""
					required
				/>
			</div>
			<cv-dropdown
				:placeholder="modelValue.gender"
				v-model:value="modelValue.gender"
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
				v-model="modelValue.birth_date"
				label="ฺBirthdate (yyyy/mm/dd)"
				placeholder=""
			/>
			<cv-text-area
				v-model="modelValue.educations"
				label="Education"
				placeholder=""
				rows="6"
			/>
			<cv-text-area label="Previous Occupations" placeholder="" rows="6" />
			<template class="flex flex-col gap-8">
				<h6>Social Media</h6>
				<div class="flex flex-col gap-4">
					<div
						class="flex flex-col"
						v-for="(link, index) in modelValue.links || []"
						:key="index"
					>
						<div class="flex items-center justify-between">
							<h6>Link {{ index + 1 }}</h6>
							<cv-button kind="danger--ghost" :icon="TrashCan16"
								>Delete</cv-button
							>
						</div>
						<div class="flex flex-col gap-4 sm:flex-row">
							<div class="flex items-end sm:w-1/3">
								<cv-dropdown
									label="Type"
									:placeholder="link.note || 'Select link type'"
									v-model:value="link.note"
								>
									<cv-dropdown-item
										v-for="item in []"
										:key="item"
										:value="item"
									>
										{{ item }}
									</cv-dropdown-item>
								</cv-dropdown>
							</div>
							<div class="flex items-end sm:w-2/3">
								<cv-text-input
									aria-label="URL"
									v-model="link.url"
									label="URL"
									placeholder=""
									class="w-full"
								/>
							</div>
						</div>
					</div>
				</div>
				<cv-button :icon="Add16" kind="tertiary" aria-label="Add" class="w-fit">
					Add Another Iten
				</cv-button>
			</template>
		</template>
	</div>
</template>
