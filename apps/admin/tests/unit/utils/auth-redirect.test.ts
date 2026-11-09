import { getSafeRedirectPath } from '~/utils/auth-redirect';
import { describe, expect, test } from 'vitest';

describe('getSafeRedirectPath', () => {
	test.each([
		['/people?page=2', '/people?page=2'],
		['/vote-events/abc#votes', '/vote-events/abc#votes'],
		[['/bills', '/people'], '/bills'],
	])('keeps in-app path %j', (value, expected) => {
		expect(getSafeRedirectPath(value)).toBe(expected);
	});

	test.each([
		undefined,
		'',
		'people',
		'//evil.com',
		'/\\evil.com',
		'https://evil.com',
		'/login',
		'/LOGIN',
		'/%2F/evil.com',
		'/a%5Cb',
		'/a\\b',
		'/%09x',
		'/a\tb',
	])('falls back to / for %j', (value) => {
		expect(getSafeRedirectPath(value)).toBe('/');
	});
});
