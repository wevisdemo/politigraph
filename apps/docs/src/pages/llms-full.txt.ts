import type { APIRoute } from 'astro';
import { GRAPHQL_ENDPOINT, PLAYGROUND_ENDPOINT } from '../constants/site';
import { getEnglishLlmsDocs, schemaSdl, SUMMARY } from '../utils/llms';

export const GET: APIRoute = async () => {
	const docs = await getEnglishLlmsDocs();

	const content = `# Politigraph

> ${SUMMARY} Query it by sending a POST request to ${GRAPHQL_ENDPOINT}.

If you cannot run the query yourself, hand the user a link to ${PLAYGROUND_ENDPOINT}?query=URL_ENCODED_GRAPHQL&variables=URL_ENCODED_JSON instead. It opens the playground with that operation and its variables filled in, ready to run.

This file contains the complete English documentation followed by the full GraphQL schema.

${docs.map((doc) => doc.markdown).join('\n\n---\n\n')}

---

# GraphQL Schema

\`\`\`graphql
${schemaSdl.trim()}
\`\`\`
`;

	return new Response(content, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
