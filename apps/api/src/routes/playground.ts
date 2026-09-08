import { toPlaygroundUrl } from '@politigraph/graphql/playground-url';
import { Elysia } from 'elysia';

/**
 * Keeps the request line of the redirected GET within nginx's 8k
 * `large_client_header_buffers`. Compression is not monotonic, so this has to
 * be measured on the built URL rather than on the incoming parameters.
 */
const MAX_URL_LENGTH = 7500;

export const playground = new Elysia().get(
	'/playground',
	({ query: { query, variables }, redirect, set }) => {
		if (!query) {
			set.status = 400;
			return 'Missing "query" parameter';
		}

		const url = toPlaygroundUrl('/graphql', query, variables);

		if (url.length > MAX_URL_LENGTH) {
			set.status = 400;
			return 'Query and variables are too long to fit in a playground link';
		}

		return redirect(url);
	},
);
