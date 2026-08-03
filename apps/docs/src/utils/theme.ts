import { onBeforeUnmount, ref, type Ref } from 'vue';

export type Theme = 'light' | 'dark';

function getCurrentTheme(): Theme {
	const theme = document.documentElement.dataset.theme;

	if (theme === 'light' || theme === 'dark') return theme;

	return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Track the theme Starlight applies to `<html data-theme>`.
 */
export function useTheme(): Ref<Theme> {
	const theme = ref<Theme>('dark');

	if (typeof document === 'undefined') return theme;

	theme.value = getCurrentTheme();

	const observer = new MutationObserver(() => {
		theme.value = getCurrentTheme();
	});
	observer.observe(document.documentElement, {
		attributeFilter: ['data-theme'],
	});

	onBeforeUnmount(() => observer.disconnect());

	return theme;
}
