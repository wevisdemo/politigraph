import type { APIRoute } from 'astro';
import {
	GRAPHQL_ENDPOINT,
	MCP_ENDPOINT,
	PLAYGROUND_ENDPOINT,
	SCHEMA_URL,
	SITE_URL,
} from '../constants/site';
import { getEnglishLlmsDocs, SUMMARY, toDocsLinkList } from '../utils/llms';

export const GET: APIRoute = async () => {
	const docs = await getEnglishLlmsDocs();

	const content = `# Politigraph

> ${SUMMARY}

- Query the API by sending a POST request to ${GRAPHQL_ENDPOINT}, or explore it interactively in the playground at the same URL.
- MCP-capable agents can connect to ${MCP_ENDPOINT} instead, an anonymous read-only Streamable HTTP endpoint with tools to read the schema and run queries.
- If you cannot run the query yourself, hand the user a link to ${PLAYGROUND_ENDPOINT}?query=URL_ENCODED_GRAPHQL&variables=URL_ENCODED_JSON instead. It opens the playground with that operation and its variables filled in, ready to run.
- Every page below is also available as plain markdown by appending \`.md\` to its URL.
- These files are generated from the English documentation. The Thai originals are served at the same paths without the \`/en\` prefix.

${toDocsLinkList(docs)}

## Reference

- [Complete GraphQL schema](${SCHEMA_URL}): full SDL of every node type, property and relationship. Read it before writing queries.

## Optional

- [All documentation in one file](${SITE_URL}/llms-full.txt): every page above plus the schema, for one-shot context
- [Explore](${SITE_URL}/en/explore): interactive graph browser for humans
- [Source code](https://github.com/wevisdemo/politigraph): report data errors or issues here
`;

	return new Response(content, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
