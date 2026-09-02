import type { APIRoute } from 'astro';
import { schemaSdl } from '../utils/llms';

export const GET: APIRoute = () =>
	new Response(schemaSdl, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
