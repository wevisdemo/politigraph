import { createClient } from '@/.genql';

export const graphqlClient = createClient({
	url: '/graphql',
});
