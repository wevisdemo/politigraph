import { createClient } from '@/.genql';

export const graphqlClient = createClient({
	url: 'http://localhost:3000/graphql',
});
