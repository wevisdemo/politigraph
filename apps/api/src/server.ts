import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { auth } from '@politigraph/auth/auth';
import { trustedOrigins } from '@politigraph/auth/trust-origins';
import { Elysia } from 'elysia';
import { apolloServer } from './neo4j-graphql';

const app = new Elysia()
	.use(
		cors({
			origin: trustedOrigins,
		}),
	)
	.use(apolloServer)
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
	.listen(process.env.PORT ?? 3000);

console.info(
	`[Elysia] API is running at http://${app.server?.hostname}:${app.server?.port}`,
);
