import { ref, watch } from 'vue';

interface FileItem {
	file: File;
	status: string;
}

export function useImageUpload() {
	const images = ref<FileItem[]>([]);
	const preview = ref<string | null>(null);
	const isUploading = ref(false);

	const config = useRuntimeConfig();

	watch(
		images,
		(newFiles) => {
			if (preview.value) {
				URL.revokeObjectURL(preview.value);
			}
			if (newFiles.length > 0 && newFiles[0].file) {
				preview.value = URL.createObjectURL(newFiles[0].file);
			} else {
				preview.value = null;
			}
		},
		{ deep: true },
	);

	function reset() {
		if (preview.value) {
			URL.revokeObjectURL(preview.value);
		}
		images.value = [];
		preview.value = null;
		isUploading.value = false;
	}

	async function upload(
		filename: string,
		path: string = 'people',
	): Promise<string | null> {
		if (images.value.length === 0 || !images.value[0].file) return null;

		const originalFile = images.value[0].file;
		let finalFilename = filename;

		if (filename && !filename.includes('.')) {
			const dotIndex = originalFile.name?.lastIndexOf('.');
			if (dotIndex && dotIndex > 0) {
				finalFilename = `${filename}.${originalFile.name!.substring(dotIndex + 1)}`;
			}
		}

		const formData = new FormData();
		formData.append('file', originalFile);
		formData.append('filename', finalFilename);
		formData.append('path', path);

		isUploading.value = true;

		const response = await fetch(`${config.public.baseUrl}/upload-image`, {
			method: 'POST',
			body: formData,
		});

		isUploading.value = false;

		if (response.ok) {
			return `${config.public.baseUrl}/assets/${path}/${finalFilename}`;
		}
		return null;
	}

	return {
		images,
		preview,
		isUploading,
		upload,
		reset,
	};
}
