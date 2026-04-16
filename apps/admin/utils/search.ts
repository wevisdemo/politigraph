import { useDebounce } from '@vueuse/core';
import { ref, watch } from 'vue';

/**
 * Shared debounced search state for list pages.
 *
 * @param options.delay - Debounce delay in milliseconds.
 * @param options.onDebouncedChange - Called after the debounced query changes.
 * @returns Search state and a handler for input updates.
 */
export const useDebouncedSearch = (
	options: {
		delay?: number;
		onDebouncedChange?: (query: string) => void;
	} = {},
) => {
	const searchQuery = ref('');
	const debouncedSearch = useDebounce(searchQuery, options.delay ?? 1000);

	watch(debouncedSearch, (query) => {
		options.onDebouncedChange?.(query);
	});

	const handleSearchChange = (query: string) => {
		searchQuery.value = query;
	};

	return {
		searchQuery,
		debouncedSearch,
		handleSearchChange,
	};
};
