<script setup lang="ts">
// @ts-ignore
import { Crop32, Download32, TrashCan32 } from '@carbon/icons-vue';
import type { Component } from 'vue';
import { CircleStencil, Cropper } from 'vue-advanced-cropper';
import type {
	AspectRatio,
	Coordinates,
	ImageSize,
	Size,
	SizeRestrictions,
	VisibleArea,
} from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

export interface ImageFile {
	file: File;
	status: string;
}

interface DefaultSizeParams {
	boundaries: Size;
	imageSize: ImageSize;
	aspectRatio: AspectRatio;
	sizeRestrictions: SizeRestrictions;
	stencilSize: Size;
	visibleArea: VisibleArea;
}

interface DefaultPositionParams {
	coordinates: Coordinates;
	imageSize: ImageSize;
	visibleArea: VisibleArea;
}

type CropperSizeFn = (params: DefaultSizeParams) => Size;
type CropperPositionFn = (params: DefaultPositionParams) => {
	left: number;
	top: number;
};

const props = defineProps<{
	imageUrl?: string | null;
	placeholderIcon?: Component;
	cropperSize?: CropperSizeFn;
	cropperPosition?: CropperPositionFn;
}>();

const emit = defineEmits<{
	(e: 'crop', blob: Blob): void;
	(e: 'delete'): void;
}>();

const files = ref<ImageFile[]>([]);
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null);
const selectedFileUrl = ref<string | null>(null);
const editImageUrl = ref<string | null>(null);

const cropperSrc = computed(() => selectedFileUrl.value || editImageUrl.value);

watch(files, (newFiles) => {
	if (newFiles.length > 0 && newFiles[0].file) {
		selectedFileUrl.value = URL.createObjectURL(newFiles[0].file);
	}
});

async function saveCroppedImage() {
	if (!cropperRef.value) return;

	const { canvas } = cropperRef.value.getResult();
	if (!canvas) return;

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((b: Blob) => {
			if (b) resolve(b);
			else reject(new Error('Failed to create blob'));
		}, 'image/jpeg');
	});

	emit('crop', blob);
	clearCropper();
}

function clearCropper() {
	if (selectedFileUrl.value) {
		URL.revokeObjectURL(selectedFileUrl.value);
		selectedFileUrl.value = null;
	}
	editImageUrl.value = null;
	files.value = [];
}

function openEditModal() {
	if (!props.imageUrl) return;
	editImageUrl.value = props.imageUrl;
}

function downloadImage() {
	if (!props.imageUrl) return;
	window.open(props.imageUrl, '_blank');
}
</script>

<template>
	<div class="flex flex-row gap-4">
		<div
			class="group relative flex size-32 flex-none items-center justify-center rounded-full border border-gray-400 bg-[#F4F4F4]"
		>
			<img
				v-if="imageUrl"
				:src="imageUrl"
				class="size-32 rounded-full object-cover"
			/>
			<div
				v-if="imageUrl"
				class="absolute inset-0 hidden items-center justify-center gap-1 rounded-full bg-black/50 group-hover:flex"
			>
				<button
					class="cursor-pointer rounded-full p-1 hover:bg-white/20"
					@click.stop="openEditModal()"
					title="Edit"
				>
					<Crop32 class="size-6 text-white" />
				</button>
				<button
					class="cursor-pointer rounded-full p-1 hover:bg-white/20"
					@click.stop="downloadImage()"
					title="Download"
				>
					<Download32 class="size-6 text-white" />
				</button>
				<button
					class="cursor-pointer rounded-full p-1 hover:bg-white/20"
					@click.stop="emit('delete')"
					title="Remove"
				>
					<TrashCan32 class="size-6 text-white" />
				</button>
			</div>
			<component
				v-else-if="placeholderIcon"
				:is="placeholderIcon"
				class="size-12 text-[#A8A8A8]"
			/>
		</div>
		<cv-file-uploader
			v-model="files"
			accept=".jpg,.png,.webp"
			:multiple="false"
			label="Image"
			helperText="อัปโหลดรูปภาพ"
			removable
			clearOnReselect
		/>
	</div>

	<ClientOnly>
		<cv-modal
			:visible="cropperSrc"
			autoHideOff
			size="lg"
			@primary-click="saveCroppedImage"
			@secondary-click="clearCropper"
			@modal-hide-request="clearCropper"
		>
			<template v-slot:title>Crop Image</template>
			<template v-slot:content>
				<div class="h-96 w-full">
					<Cropper
						ref="cropperRef"
						:src="cropperSrc"
						:stencil-component="CircleStencil"
						:stencil-props="{
							aspectRatio: 1,
						}"
						:default-size="cropperSize"
						:default-position="cropperPosition"
						class="h-full w-full"
					/>
				</div>
			</template>
			<template v-slot:secondary-button>Cancel</template>
			<template v-slot:primary-button>Save</template>
		</cv-modal>
	</ClientOnly>
</template>
