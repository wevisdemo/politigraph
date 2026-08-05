import { ref } from 'vue';
import type { useToastNotification } from './use-toast-notification';

/**
 * Runs a save routine at most once at a time and reports failures to the user.
 *
 * @param toast - Toast notification instance of the page owning the save button.
 * @returns The in-flight flag to disable the button with, and the guarded runner.
 */
export function useSaveGuard(toast: ReturnType<typeof useToastNotification>) {
	const isSaving = ref(false);

	const guardSave = async (save: () => Promise<unknown>) => {
		if (isSaving.value) return;

		isSaving.value = true;

		try {
			await save();
		} catch (error) {
			console.error('Failed to save changes:', error);
			toast.show({
				kind: 'warning',
				title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
				subTitle: 'กรุณาลองใหม่อีกครั้ง',
			});
		} finally {
			isSaving.value = false;
		}
	};

	return { isSaving, guardSave };
}
