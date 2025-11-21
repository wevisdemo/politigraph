import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { auth, trustedOrigins } from '@politigraph/auth/auth';
import { schema } from '@politigraph/graphql/neo4j-graphql';
import { Elysia, type Context } from 'elysia';
import { apollo } from './apollo';

const port = process.env.PORT ?? 3000;
const landingSpa = Bun.file('public/index.html');

const app = new Elysia()
	.use(
		cors({
			origin: trustedOrigins,
		}),
	)
	.use(
		apollo({
			schema,
			allowBatchedHttpRequests: true,
			introspection: true,
			context: async ({ request: { headers } }: Context) => {
				const apiKey = headers.get('x-api-key');
				const cookie = headers.get('cookie');

				if (!apiKey && !cookie) return;

				const res = await fetch(`http://127.0.0.1:${port}/auth/token`, {
					headers: apiKey
						? {
								'x-api-key': apiKey,
							}
						: ({ cookie } as { cookie: string }),
				});

				if (res.ok) {
					return res.json();
				}
			},
		}),
	)
	.all('/auth/*', (ctx) => auth.handler(ctx.request))
	.use(
		staticPlugin({
			prefix: '/',
			alwaysStatic: true,
		}),
	)
	.get('/', () => landingSpa)
	.onError(({ code, path, set }) => {
		// Bun SPA Workaround https://github.com/elysiajs/elysia/issues/1515#issuecomment-3521899834
		if (code === 'NOT_FOUND' && !path.startsWith('/auth/')) {
			set.status = 200;
			return landingSpa;
		}
	})
	.listen(port);

console.info(
	`[Elysia] API is running at http://${app.server?.hostname}:${app.server?.port}`,
);
