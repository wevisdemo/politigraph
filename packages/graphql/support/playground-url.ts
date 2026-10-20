import { compressToEncodedURIComponent } from 'lz-string';

/**
 * Build a link that opens the Apollo Sandbox playground with an operation and
 * its variables already filled in, matching the format of the sandbox's own
 * "Copy Link" button.
 *
 * @param graphqlUrl absolute or root-relative URL of the GraphQL endpoint
 * @param query GraphQL operation to prefill
 * @param variables JSON object of variables, as a string
 */
export function toPlaygroundUrl(
	graphqlUrl: string,
	query: string,
	variables?: string,
) {
	const state = compressToEncodedURIComponent(
		JSON.stringify({
			document: query,
			variables: formatVariables(variables),
		}),
	);

	return `${graphqlUrl}?explorerURLState=${state}`;
}

function formatVariables(variables?: string) {
	if (!variables) return '';

	try {
		return JSON.stringify(JSON.parse(variables), null, 2);
	} catch {
		return variables;
	}
}
