import type { GraphqlDataResponse } from './schema';

type GraphqlResponse =
	| {
			data: GraphqlDataResponse;
	  }
	| { errors: { message: string }[] };

const RATE_LIMIT_DELAY = 1000 / 3;

let lastRequestTime = 0;

export async function fetchGraphql(
	query: string,
	variables?: Record<string, unknown>,
) {
	const now = Date.now();
	const timeSinceLastRequest = now - lastRequestTime;

	if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
		await new Promise((resolve) =>
			setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest),
		);
	}

	lastRequestTime = Date.now();

	const response = await fetch(
		`${
			import.meta.env.POLITIGRAPH_URL ?? 'https://politigraph.wevis.info'
		}/graphql`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query: query.replaceAll(' id ', ' __typename id '),
				variables: variables ?? {},
			}),
		},
	);

	if (!response.ok) {
		throw new Error(response.statusText);
	}

	const jsonResponse: GraphqlResponse = await response.json();

	if ('errors' in jsonResponse) {
		throw new Error(jsonResponse.errors.map((e) => e.message).join('\n'));
	}

	return jsonResponse;
}
