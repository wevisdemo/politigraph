import type { APIRoute } from 'astro';
import {
	getEnglishLlmsDocs,
	GRAPHQL_ENDPOINT,
	schemaSdl,
	SUMMARY,
} from '../utils/llms';

export const GET: APIRoute = async () => {
	const docs = await getEnglishLlmsDocs();

	const content = `# Politigraph

> ${SUMMARY} Query it by sending a POST request to ${GRAPHQL_ENDPOINT}.

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
