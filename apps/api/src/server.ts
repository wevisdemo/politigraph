import { staticPlugin } from '@elysiajs/static';
import { auth } from '@politigraph/auth/auth';
import { initNeo4jGraphql } from '@politigraph/graphql/neo4j-graphql';
import { Elysia, type Context } from 'elysia';
import { apollo } from './apollo';

const adminEntrypoint = Bun.file('public/admin/index.html');
const port = process.env.PORT ?? 3000;
const origin = `http://127.0.0.1:${port}`;

const neo4jGraphql = initNeo4jGraphql(`${origin}/auth/jwks`);
const schema = await neo4jGraphql.getSchema();
await neo4jGraphql.checkNeo4jCompat();
await neo4jGraphql.assertIndexesAndConstraints();

const app = new Elysia()
	.use(
		apollo({
			schema,
			allowBatchedHttpRequests: true,
			introspection: true,
			context: async ({ request: { headers } }: Context) => {
				const apiKey = headers.get('x-api-key');
				const cookie = headers.get('cookie');

				if (!apiKey && !cookie?.includes('better-auth.session_token')) return;

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
			},
		}),
	)
	.use(
		staticPlugin({
			prefix: '/',
			alwaysStatic: false,
		}),
	)
	.onError(({ code, path, set, request }) => {
		// Can't use catch all route with static serve on root
		if (code === 'NOT_FOUND' && path.startsWith('/auth/')) {
			set.status = 200;
			return auth.handler(request);
		}
	});

if (await adminEntrypoint.exists()) {
	app.onError(({ code, path, set }) => {
		// Bun SPA Workaround https://github.com/elysiajs/elysia/issues/1515#issuecomment-3521899834
		if (code === 'NOT_FOUND' && path.startsWith('/admin')) {
			set.status = 200;
			return adminEntrypoint;
		}
	});
}

if (process.env.NODE_ENV !== 'production') {
	app.use((await import('@elysiajs/cors')).cors());
}

app.listen(port);

console.log(`🦊 Elysia is running at http://localhost:${port}`);
