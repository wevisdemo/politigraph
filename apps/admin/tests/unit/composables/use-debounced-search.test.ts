import { useDebouncedSearch } from '~/composables/use-debounced-search';
import { describe, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';

describe('useDebouncedSearch', () => {
	test('initializes with empty search query', () => {
		const { searchQuery, debouncedSearch } = useDebouncedSearch();

		expect(searchQuery.value).toBe('');
		expect(debouncedSearch.value).toBe('');
	});

	test('updates searchQuery on handleSearchChange', () => {
		const { searchQuery, handleSearchChange } = useDebouncedSearch();

		handleSearchChange('test query');

		expect(searchQuery.value).toBe('test query');
	});

	test('calls onDebouncedChange after delay', async () => {
		vi.useFakeTimers();
		const onDebouncedChange = vi.fn();
		const { handleSearchChange } = useDebouncedSearch({
			delay: 500,
			onDebouncedChange,
		});

		handleSearchChange('test');
		await nextTick();

		expect(onDebouncedChange).not.toHaveBeenCalled();

		vi.advanceTimersByTime(500);
		await nextTick();

		expect(onDebouncedChange).toHaveBeenCalledWith('test');

		vi.useRealTimers();
	});

	test('uses default 1000ms delay', async () => {
		vi.useFakeTimers();
		const onDebouncedChange = vi.fn();
		const { handleSearchChange } = useDebouncedSearch({
			onDebouncedChange,
		});

		handleSearchChange('test');
		await nextTick();

		vi.advanceTimersByTime(999);
		await nextTick();
		expect(onDebouncedChange).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		await nextTick();
		expect(onDebouncedChange).toHaveBeenCalledWith('test');

		vi.useRealTimers();
	});
});
