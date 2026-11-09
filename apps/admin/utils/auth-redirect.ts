import { getStringQueryParam } from '~/utils/query';
import type { LocationQueryValue } from 'vue-router';

/**
 * Reads the `redirect` query param of the login page, accepting only in-app paths.
 *
 * @param value - The `redirect` query value from vue-router
 * @returns The path to return to after login, or `/` when missing or unsafe
 */
export const getSafeRedirectPath = (
	value: LocationQueryValue | LocationQueryValue[] | undefined,
): string => {
	const path = getStringQueryParam(value);

	return /^\/(?![/\\])/.test(path) &&
		!/^\/login(?:[/?#]|$)/i.test(path) &&
		!/[\\\p{Cc}]|%2f|%5c|%[01][0-9a-f]/iu.test(path)
		? path
		: '/';
};
