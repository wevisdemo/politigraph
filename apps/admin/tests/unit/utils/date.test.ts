import { formatDate, parseDate, serializeDate } from '~/utils/date';
import { describe, expect, test } from 'vitest';

describe('parseDate', () => {
	test('handles valid date string', () => {
		const result = parseDate('2024-01-15');
		expect(result).toBeInstanceOf(Date);
		expect(result?.getFullYear()).toBe(2024);
		expect(result?.getMonth()).toBe(0); // January is 0
		expect(result?.getDate()).toBe(15);
	});

	test('handles null input', () => {
		expect(parseDate(null)).toBeNull();
	});

	test('handles empty string as falsy', () => {
		expect(parseDate('')).toBeNull();
	});
});

describe('formatDate', () => {
	test('handles Date object', () => {
		const date = new Date(2024, 0, 15); // January 15, 2024 local time
		const result = formatDate(date);
		expect(result).toBe('15 ม.ค. 2567');
	});

	test('handles ISO string', () => {
		// Use local time construction to avoid timezone issues
		const date = new Date(2024, 0, 15);
		const result = formatDate(date.toISOString());
		expect(result).toBe('15 ม.ค. 2567');
	});

	test('handles 10-char date string', () => {
		const result = formatDate('2024-01-15');
		expect(result).toBe('15 ม.ค. 2567');
	});

	test('handles null input', () => {
		expect(formatDate(null)).toBeNull();
	});

	test('handles invalid date string', () => {
		expect(formatDate('invalid-date')).toBeNull();
	});
});

describe('serializeDate', () => {
	test('returns YYYY-MM-DD format from Date object', () => {
		const date = new Date(2024, 0, 15); // January 15, 2024
		expect(serializeDate(date)).toBe('2024-01-15');
	});

	test('returns YYYY-MM-DD format from ISO string', () => {
		// Use local time construction to avoid timezone issues
		const date = new Date(2024, 0, 15);
		expect(serializeDate(date.toISOString())).toBe('2024-01-15');
	});

	test('returns YYYY-MM-DD format from 10-char date string', () => {
		expect(serializeDate('2024-01-15')).toBe('2024-01-15');
	});

	test('handles null input', () => {
		expect(serializeDate(null)).toBeNull();
	});

	test('handles invalid date string', () => {
		expect(serializeDate('invalid-date')).toBeNull();
	});

	test('pads single-digit month and day', () => {
		const date = new Date(2024, 0, 5); // January 5, 2024
		expect(serializeDate(date)).toBe('2024-01-05');
	});
});
