import { ref } from 'vue';

export function useImageUpload() {
	const imageBlob = ref<Blob | null>(null);
	const previewImage = ref<string | null>(null);

	const config = useRuntimeConfig();

	function setImageBlob(blob: Blob) {
		if (previewImage.value) {
			URL.revokeObjectURL(previewImage.value);
		}
		imageBlob.value = blob;
		previewImage.value = URL.createObjectURL(blob);
	}

	function reset() {
		if (previewImage.value) {
			URL.revokeObjectURL(previewImage.value);
		}
		imageBlob.value = null;
		previewImage.value = null;
	}

	async function upload(
		filename: string,
		path: string = '',
	): Promise<string | null> {
		if (!imageBlob.value) return null;

		const formData = new FormData();
		formData.append('file', imageBlob.value);
		formData.append('filename', filename);
		formData.append('path', path);

		const response = await fetch(`${config.public.baseUrl}/upload-image`, {
			method: 'POST',
			body: formData,
		});

		return response.ok
			? `${config.public.baseUrl}/assets/${path}/${await response.text()}`
			: null;
	}

	return {
		previewImage,
		imageBlob,
		setImageBlob,
		upload,
		reset,
	};
}
