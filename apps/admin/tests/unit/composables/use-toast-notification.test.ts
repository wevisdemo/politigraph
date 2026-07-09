import { useToastNotification } from '~/composables/use-toast-notification';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';

describe('useToastNotification', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('initializes with null notification', () => {
		const { notification } = useToastNotification();

		expect(notification.value).toBeNull();
	});

	test('shows notification', () => {
		const { notification, show } = useToastNotification();

		show({
			kind: 'success',
			title: 'Success!',
			subTitle: 'Operation completed',
		});

		expect(notification.value).toEqual({
			kind: 'success',
			title: 'Success!',
			subTitle: 'Operation completed',
			caption: undefined,
		});
	});

	test('hides notification', () => {
		const { notification, show, hide } = useToastNotification();

		show({ kind: 'error', title: 'Error!' });
		expect(notification.value).not.toBeNull();

		hide();
		expect(notification.value).toBeNull();
	});

	test('auto-dismisses after 5000ms', async () => {
		const { notification, show } = useToastNotification();

		show({ kind: 'warning', title: 'Warning!' });
		expect(notification.value).not.toBeNull();

		vi.advanceTimersByTime(4999);
		await nextTick();
		expect(notification.value).not.toBeNull();

		vi.advanceTimersByTime(1);
		await nextTick();
		expect(notification.value).toBeNull();
	});

	test('replaces previous notification when showing new one', () => {
		const { notification, show } = useToastNotification();

		show({ kind: 'success', title: 'First' });
		expect(notification.value?.title).toBe('First');

		show({ kind: 'error', title: 'Second' });
		expect(notification.value?.title).toBe('Second');
		expect(notification.value?.kind).toBe('error');
	});

	test('clears timeout when hiding', () => {
		const { notification, show, hide } = useToastNotification();

		show({ kind: 'info', title: 'Test' });
		hide();

		expect(notification.value).toBeNull();

		vi.advanceTimersByTime(10000);
		expect(notification.value).toBeNull();
	});
});
