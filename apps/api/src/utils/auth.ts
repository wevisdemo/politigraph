import { auth } from '@politigraph/auth/auth';
import { Context } from 'elysia';

export async function getJwtToken(
	headers: Headers,
	origin: string,
): Promise<Context | null> {
	const apiKey = headers.get('x-api-key');
	const cookie = headers.get('cookie');

	if (!apiKey && !cookie?.includes('better-auth.session_token')) {
		return null;
	}

	const res = await auth.handler(
		new Request(`${origin}/auth/token`, {
			headers: apiKey
				? {
						'x-api-key': apiKey,
					}
				: ({ cookie } as { cookie: string }),
		}),
	);

	if (res.ok) {
		return res.json();
	}

	return null;
}
