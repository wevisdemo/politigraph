import {
	getArrayQueryParam,
	getNumberQueryParam,
	getStringQueryParam,
} from '~/utils/query';
import { describe, expect, test } from 'vitest';

describe('getStringQueryParam', () => {
	test('returns the value when it is a string', () => {
		expect(getStringQueryParam('hello')).toBe('hello');
	});

	test('returns the first element when value is an array', () => {
		expect(getStringQueryParam(['first', 'second'])).toBe('first');
	});

	test('returns fallback when value is undefined', () => {
		expect(getStringQueryParam(undefined)).toBe('');
	});

	test('returns custom fallback when value is undefined', () => {
		expect(getStringQueryParam(undefined, 'default')).toBe('default');
	});

	test('returns fallback when array element is null', () => {
		expect(getStringQueryParam([null])).toBe('');
	});
});

describe('getNumberQueryParam', () => {
	test('parses a valid positive number string', () => {
		expect(getNumberQueryParam('42')).toBe(42);
	});

	test('returns fallback for zero', () => {
		expect(getNumberQueryParam('0')).toBe(0);
	});

	test('returns fallback for negative numbers', () => {
		expect(getNumberQueryParam('-5')).toBe(0);
	});

	test('returns fallback for non-numeric strings', () => {
		expect(getNumberQueryParam('abc')).toBe(0);
	});

	test('returns custom fallback for invalid input', () => {
		expect(getNumberQueryParam(undefined, 10)).toBe(10);
	});

	test('parses first element from array', () => {
		expect(getNumberQueryParam(['5', '10'])).toBe(5);
	});
});

describe('getArrayQueryParam', () => {
	test('returns empty array for undefined', () => {
		expect(getArrayQueryParam(undefined)).toEqual([]);
	});

	test('returns array with single string value', () => {
		expect(getArrayQueryParam('option1')).toEqual(['option1']);
	});

	test('returns array from array input', () => {
		expect(getArrayQueryParam(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
	});

	test('expands ALL to allOptions when value is ALL', () => {
		const allOptions = ['opt1', 'opt2', 'opt3'];
		expect(getArrayQueryParam('ALL', allOptions)).toEqual(allOptions);
	});

	test('expands ALL to allOptions when array contains ALL', () => {
		const allOptions = ['opt1', 'opt2'];
		expect(getArrayQueryParam(['ALL'], allOptions)).toEqual(allOptions);
	});

	test('filters out null values from array', () => {
		expect(getArrayQueryParam(['a', null, 'b'])).toEqual(['a', 'b']);
	});

	test('returns empty array when ALL but no allOptions provided', () => {
		expect(getArrayQueryParam('ALL')).toEqual(['ALL']);
	});
});
