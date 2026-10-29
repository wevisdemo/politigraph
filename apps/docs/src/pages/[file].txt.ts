import type { APIRoute, GetStaticPaths } from 'astro';
import type { Language } from '../utils/i18n';
import { toLlmsFull, toLlmsIndex } from '../utils/llms';

const FILES: Record<
	string,
	{ lang: Language; build: (lang: Language) => Promise<string> }
> = {
	llms: { lang: 'en', build: toLlmsIndex },
	'llms-full': { lang: 'en', build: toLlmsFull },
	'llms-th': { lang: 'th', build: toLlmsIndex },
	'llms-full-th': { lang: 'th', build: toLlmsFull },
};

export const getStaticPaths: GetStaticPaths = () =>
	Object.entries(FILES).map(([file, props]) => ({ params: { file }, props }));

export const GET: APIRoute = async ({ props }) =>
	new Response(await props.build(props.lang), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
