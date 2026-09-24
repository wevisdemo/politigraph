import type { GraphqlDataResponse } from './schema';

type GraphqlResponse =
	| {
			data: GraphqlDataResponse;
	  }
	| { errors: { message: string }[] };

const GRAPHQL_URL =
	import.meta.env.PUBLIC_POLITIGRAPH_URL ??
	'https://politigraph.wevis.info/graphql';

// Below the API rate limit of 30 requests per 10 seconds
const RATE_LIMIT_DELAY = 1000 / 2.5;

let nextSlot = Promise.resolve();

/** Queues callers so concurrent requests are spaced out instead of fired together */
async function waitForSlot() {
	const slot = nextSlot;
	nextSlot = slot.then(
		() => new Promise<void>((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY)),
	);
	await slot;
}

const RETRY_DELAYS = [1000, 5000, 15000];

const isRetriable = ({ status }: Response) => status === 429 || status >= 500;

async function post(
	init: RequestInit,
	retryDelays = RETRY_DELAYS,
): Promise<Response> {
	const [delay, ...remainingDelays] = retryDelays;

	await waitForSlot();

	try {
		const response = await fetch(GRAPHQL_URL, init);

		if (delay === undefined || !isRetriable(response)) return response;
	} catch (error) {
		if (delay === undefined) throw error;
	}

	await new Promise((resolve) => setTimeout(resolve, delay));

	return post(init, remainingDelays);
}

export async function fetchGraphql(
	query: string,
	variables?: Record<string, unknown>,
) {
	const response = await post({
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			// Browser requests are identified by their origin
			...(import.meta.env.SSR && {
				'apollographql-client-name': 'politigraph-docs',
			}),
		},
		body: JSON.stringify({
			query: query.replaceAll(' id ', ' __typename id '),
			variables: variables ?? {},
		}),
	});

	const jsonResponse: GraphqlResponse | null = await response
		.json()
		.catch(() => null);

	if (jsonResponse && 'errors' in jsonResponse) {
		throw new Error(jsonResponse.errors.map((e) => e.message).join('\n'));
	}

	if (!response.ok || !jsonResponse) {
		throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
	}

	return jsonResponse;
}
