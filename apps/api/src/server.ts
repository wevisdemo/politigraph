import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { auth, trustedOrigins } from '@politigraph/auth/auth';
import { schema } from '@politigraph/graphql/neo4j-graphql';
import { Elysia, type Context } from 'elysia';
import { apollo } from './apollo';

const port = process.env.PORT ?? 3000;

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
				const res = await fetch(`http://127.0.0.1:${port}/auth/token`, {
					headers: {
						cookie: headers.get('cookie') ?? '',
						'x-api-key': headers.get('x-api-key') ?? '',
					},
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
	.get('/', () => Bun.file('public/index.html'))
	.onError(({ code, path, set }) => {
		// Bun SPA Workaround https://github.com/elysiajs/elysia/issues/1515#issuecomment-3521899834
		if (code === 'NOT_FOUND' && !path.startsWith('/auth/')) {
			set.status = 200;
			return Bun.file('public/index.html');
		}
	})
	.listen(port);

console.info(
	`[Elysia] API is running at http://${app.server?.hostname}:${app.server?.port}`,
);
