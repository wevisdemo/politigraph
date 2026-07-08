import { beforeEach, describe, expect, mock, test } from 'bun:test';

const mockAuthHandler = mock(() => {});
mock.module('@politigraph/auth/auth', () => ({
	auth: {
		handler: mockAuthHandler,
	},
}));

const { getJwtToken } = await import('../../src/utils/auth');

const ORIGIN = 'http://localhost:3000';

describe('getJwtToken', () => {
	beforeEach(() => {
		mockAuthHandler.mockReset();
	});

	test('returns null when neither API key nor session cookie is present', async () => {
		const headers = new Headers();
		const result = await getJwtToken(headers, ORIGIN);
		expect(result).toBeNull();
	});

	test('returns null when cookie exists but does not contain session token', async () => {
		const headers = new Headers({
			cookie: 'other_cookie=value',
		});
		const result = await getJwtToken(headers, ORIGIN);
		expect(result).toBeNull();
	});

	test('forwards an API key to auth.handler', async () => {
		const mockResponse = {
			ok: true,
			json: () => Promise.resolve({ token: 'test' }),
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockAuthHandler.mockReturnValue(mockResponse as any);

		const headers = new Headers({
			'x-api-key': 'test-api-key',
		});

		await getJwtToken(headers, ORIGIN);

		expect(mockAuthHandler).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const request = (mockAuthHandler.mock.calls[0] as any)[0] as Request;
		expect(request.url).toBe(`${ORIGIN}/auth/token`);
		expect(request.headers.get('x-api-key')).toBe('test-api-key');
	});

	test('forwards a session cookie to auth.handler', async () => {
		const mockResponse = {
			ok: true,
			json: () => Promise.resolve({ token: 'test' }),
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockAuthHandler.mockReturnValue(mockResponse as any);

		const headers = new Headers({
			cookie: 'better-auth.session_token=abc123',
		});

		await getJwtToken(headers, ORIGIN);

		expect(mockAuthHandler).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const request = (mockAuthHandler.mock.calls[0] as any)[0] as Request;
		expect(request.url).toBe(`${ORIGIN}/auth/token`);
		expect(request.headers.get('cookie')).toBe(
			'better-auth.session_token=abc123',
		);
	});

	test('returns parsed JSON on success', async () => {
		const tokenData = { token: 'jwt-token', userId: '123' };
		const mockResponse = {
			ok: true,
			json: () => Promise.resolve(tokenData),
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockAuthHandler.mockReturnValue(mockResponse as any);

		const headers = new Headers({
			'x-api-key': 'test-api-key',
		});

		const result = await getJwtToken(headers, ORIGIN);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(result).toEqual(tokenData as any);
	});

	test('returns null on auth failure', async () => {
		const mockResponse = { ok: false, json: () => Promise.resolve({}) };
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockAuthHandler.mockReturnValue(mockResponse as any);

		const headers = new Headers({
			'x-api-key': 'invalid-key',
		});

		const result = await getJwtToken(headers, ORIGIN);
		expect(result).toBeNull();
	});
});
