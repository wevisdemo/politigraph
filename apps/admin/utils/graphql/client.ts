import { createClient } from '@politigraph/graphql/genql';

/**
 * Creates the GraphQL client configured for the admin app backend.
 *
 * @returns A batched GraphQL client instance.
 */
export function useGraphqlClient() {
	const config = useRuntimeConfig();

	return createClient({
		url: `${config.public.baseUrl}/graphql`,
		batch: true,
	});
}
