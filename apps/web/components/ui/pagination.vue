<script setup lang="ts">
//@ts-ignore
import { CaretLeft16, CaretRight16 } from '@carbon/icons-vue';

const props = defineProps({
	page: {
		type: Number,
		required: true,
	},
	pageSize: {
		type: Number,
		required: true,
	},
	totalCount: {
		type: Number,
		required: true,
	},
	numberOfPage: {
		type: Number,
		required: true,
	},
});
const emit = defineEmits(['onPageChange', 'onPageSizeChange']);

const pageList = computed(() =>
	Array.from(Array(props.numberOfPage + 1).keys()).splice(1),
);

const pageSizeList = [10, 20, 30, 40, 50];

const handlePageSizeChange = (value: number) => {
	emit('onPageSizeChange', Number(value));
	emit('onPageChange', 1);
};
const handlePageChange = (value: number) => {
	emit('onPageChange', Number(value));
};
</script>

<template>
	<div>
		<div class="flex flex-row items-center justify-between bg-white">
			<div class="flex flex-row items-center">
				<div class="flex flex-row items-center">
					<div class="px-4">Items per page:</div>
					<cv-dropdown
						class="w-24 border-b-0"
						:light="true"
						:modelValue="`${pageSize}`"
						@change="handlePageSizeChange"
					>
						<cv-dropdown-item
							:key="`pagesize-${item}`"
							v-for="item in pageSizeList"
							:value="`${item}`"
							><span style="color: darkred">{{ item }}</span></cv-dropdown-item
						>
					</cv-dropdown>
				</div>
				<div>
					<div class="px-4">
						{{
							`${(page - 1) * pageSize + 1} - ${page * pageSize} of ${totalCount} items`
						}}
					</div>
				</div>
			</div>
			<div class="flex flex-row items-center">
				<cv-dropdown
					:light="true"
					class="w-24 border-b-0"
					:modelValue="`${page}`"
					@change="handlePageChange"
				>
					<cv-dropdown-item
						:key="`page-${item}`"
						v-for="item in pageList"
						:value="`${item}`"
						><span style="color: darkred">{{ item }}</span></cv-dropdown-item
					>
				</cv-dropdown>
				<div class="px-4">
					{{ `of ${pageList.at(-1)} Pages` }}
				</div>

				<cv-icon-button
					label="Previous"
					kind="secondary"
					:icon="CaretLeft16"
					:disabled="page <= 1"
					@click="handlePageChange(page - 1)"
				/>
				<cv-icon-button
					label="Next"
					kind="secondary"
					:icon="CaretRight16"
					:disabled="page >= numberOfPage"
					@click="handlePageChange(page + 1)"
				/>
			</div>
		</div>
	</div>
</template>
