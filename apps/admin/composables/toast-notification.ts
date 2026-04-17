const NOTIFICATION_DURATION = 5000;

export type ToastNotificationKind = 'success' | 'warning' | 'error' | 'info';

export type ToastNotificationState = {
	kind: ToastNotificationKind;
	title: string;
	subTitle?: string;
	caption?: string;
};

export function useToastNotification() {
	const notification = ref<ToastNotificationState | null>(null);

	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	const clearTimeoutId = () => {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = undefined;
		}
	};

	const hide = () => {
		notification.value = null;
		clearTimeoutId();
	};

	const show = (nextState: ToastNotificationState) => {
		hide();

		notification.value = {
			kind: nextState.kind,
			title: nextState.title,
			subTitle: nextState.subTitle,
			caption: nextState.caption,
		};

		timeoutId = setTimeout(hide, NOTIFICATION_DURATION);
	};

	onScopeDispose(clearTimeoutId);

	return {
		hide,
		notification,
		show,
	};
}
