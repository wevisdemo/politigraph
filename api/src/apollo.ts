import {
	ApolloServer,
	BaseContext,
	GraphQLServerContext,
	type ApolloServerOptions,
} from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { type StartStandaloneServerOptions } from '@apollo/server/standalone';
import { Elysia, t } from 'elysia';

export interface ServerRegistration<
	Path extends string = '/graphql',
	TContext extends BaseContext = BaseContext,
> extends Omit<StartStandaloneServerOptions<any>, 'context'> {
	path?: Path;
	context?: (context: TContext) => Promise<TContext>;
}

export type ElysiaApolloConfig<
	Path extends string = '/graphql',
	TContext extends BaseContext = BaseContext,
> = ApolloServerOptions<TContext> & ServerRegistration<Path, TContext>;

const getQueryString = (url: string) => url.slice(url.indexOf('?', 11) + 1);

const BODY = t.Object(
	{
		operationName: t.Optional(t.Union([t.String(), t.Null()])),
		query: t.String(),
		variables: t.Optional(
			t.Object(
				{},
				{
					additionalProperties: true,
				},
			),
		),
	},
	{
		additionalProperties: true,
	},
);

export class ElysiaApolloServer<
	Context extends BaseContext = BaseContext,
> extends ApolloServer<Context> {
	public async createHandler<Path extends string = '/graphql'>({
		path = '/graphql' as Path,
		context: apolloContext = async () => ({}) as any,
	}: ServerRegistration<Path, Context>) {
		await this.start();

		const landingPage = await ApolloServerPluginLandingPageLocalDefault({
			footer: false,
			embed: {
				runTelemetry: false,
				endpointIsEditable: false,
			},
		})
			.serverWillStart?.({} as GraphQLServerContext)
			.then((r) =>
				r?.renderLandingPage
					? // @ts-expect-error html is an sync function
						r.renderLandingPage().then((r) => r.html())
					: null,
			);

		const executeHTTPGraphQLRequest = this.executeHTTPGraphQLRequest.bind(this);

		const app = new Elysia();

		if (landingPage)
			app.get(
				path,
				new Response(landingPage as string, {
					headers: {
						'Content-Type': 'text/html',
					},
				}),
			);

		return app.post(
			path,
			async function handleGraph(context) {
				const {
					body,
					request,
					request: { method, url, headers },
				} = context;

				const res = await executeHTTPGraphQLRequest({
					httpGraphQLRequest: {
						method,
						body,
						search: getQueryString(url),
						request,
						// @ts-ignore
						headers,
					},
					// @ts-ignore
					context: () => apolloContext(context),
				}).catch((x) => x);

				if (res.body.kind !== 'complete') return '';

				return new Response(res.body.string, {
					status: res.status ?? 200,
					headers: res.headers,
				});
			},
			{
				body: t.Union([BODY, t.Array(BODY)]),
			},
		);
	}
}

export const apollo = async <
	Path extends string = '/graphql',
	TContext extends BaseContext = BaseContext,
>({
	path,
	context,
	...config
}: ElysiaApolloConfig<Path, TContext>) =>
	new ElysiaApolloServer<TContext>(config).createHandler<Path>({
		context,
		path,
	});
