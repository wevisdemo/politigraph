import { toPlaygroundUrl } from '@politigraph/graphql/playground-url';
import { describe, expect, test } from 'bun:test';
import { Elysia } from 'elysia';
import { playground } from '../../src/routes/playground';

const app = new Elysia().use(playground);

function request(search: string) {
	return app.handle(new Request(`http://localhost/playground${search}`));
}

describe('playground route', () => {
	test('redirects to the playground with query and variables prefilled', async () => {
		const response = await request(
			`?query=${encodeURIComponent('{ organizations { name } }')}&variables=${encodeURIComponent('{"limit":2}')}`,
		);

		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe(
			toPlaygroundUrl('/graphql', '{ organizations { name } }', '{"limit":2}'),
		);
	});

	test('rejects a missing query', async () => {
		expect((await request('')).status).toBe(400);
	});

	test('rejects a query whose compressed link would overflow the request line', async () => {
		const incompressible = Array.from(
			crypto.getRandomValues(new Uint8Array(6000)),
			(byte) => String.fromCharCode(33 + (byte % 94)),
		).join('');

		const response = await request(
			`?query=${encodeURIComponent(incompressible)}`,
		);

		expect(response.status).toBe(400);
	});

	test('accepts a long query that compresses well', async () => {
		const repetitive = '{ organizations { name } }\n'.repeat(300);

		const response = await request(`?query=${encodeURIComponent(repetitive)}`);

		expect(response.status).toBe(302);
	});
});
