import type { APIRoute, GetStaticPaths } from 'astro';
import { getLlmsDocs } from '../utils/llms';

export const getStaticPaths: GetStaticPaths = async () => {
	const docs = await getLlmsDocs();

	return docs.map((doc) => ({
		params: { slug: doc.id },
		props: { markdown: doc.markdown },
	}));
};

export const GET: APIRoute = ({ props }) =>
	new Response(props.markdown, {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
	});
