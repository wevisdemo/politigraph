import type { LocationQueryValue } from 'vue-router';

/**
 * Parse a single query parameter value and return it as a string.
 * If the value is an array, returns the first element.
 * If the value is falsy, returns the fallback value.
 *
 * @param value - The query parameter value from vue-router
 * @param fallback - The default value to return if val is falsy (default: '')
 * @returns A string value
 */
export const getStringQueryParam = (
	value: LocationQueryValue | LocationQueryValue[] | undefined,
	fallback: string = '',
): string => {
	if (Array.isArray(value)) return value[0] ?? fallback;
	return value ?? fallback;
};

/**
 * Parse a query parameter value and return it as a number.
 * Validates that the number is positive (> 0).
 * If the value is an array, uses the first element.
 *
 * @param value - The query parameter value from vue-router
 * @param fallback - The default value if parsing fails or value is invalid (default: 0)
 * @returns A positive number value
 */
export const getNumberQueryParam = (
	value: LocationQueryValue | LocationQueryValue[] | undefined,
	fallback: number = 0,
): number => {
	const stringVal = Array.isArray(value) ? value[0] : value;

	if (!stringVal) return fallback;

	const parsedValue = +stringVal;

	return Number.isFinite(parsedValue) && parsedValue > 0
		? parsedValue
		: fallback;
};

/**
 * Parse a query parameter value and return it as an array of strings.
 * Handles the special 'ALL' value by expanding it to the provided allOptions array.
 *
 * @param val - The query parameter value from vue-router
 * @param allOptions - Array of all possible options to use when 'ALL' is encountered
 * @returns An array of string values
 */
export const getArrayQueryParam = (
	val: LocationQueryValue | LocationQueryValue[] | undefined,
	allOptions: string[] = [],
): string[] => {
	if (!val) return [];

	if (Array.isArray(val)) {
		if (val.includes('ALL') && allOptions.length > 0) {
			return [...allOptions];
		}
		return val.filter(Boolean) as string[];
	}

	if (val === 'ALL' && allOptions.length > 0) {
		return [...allOptions];
	}

	return [val];
};
