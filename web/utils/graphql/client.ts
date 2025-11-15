import { createClient } from '@politigraph/graphql/genql';

export function useGraphqlClient() {
	const config = useRuntimeConfig();

	return createClient({
		url: `${config.public.baseUrl}/graphql`,
		batch: true,
	});
}
