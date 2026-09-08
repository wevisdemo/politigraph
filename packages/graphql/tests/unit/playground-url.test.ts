import { describe, expect, test } from 'bun:test';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { toPlaygroundUrl } from '../../playground-url';

function decodeState(url: string) {
	const state = new URL(url, 'http://localhost').searchParams.get(
		'explorerURLState',
	);

	return JSON.parse(decompressFromEncodedURIComponent(state ?? ''));
}

describe('toPlaygroundUrl', () => {
	test('encodes query and variables as sandbox state on the given endpoint', () => {
		const url = toPlaygroundUrl(
			'https://politigraph.wevis.info/graphql',
			'query Parties($limit: Int) {\n  organizations(limit: $limit) {\n    name\n  }\n}',
			'{"limit":2}',
		);

		expect(url).toStartWith(
			'https://politigraph.wevis.info/graphql?explorerURLState=',
		);
		expect(decodeState(url)).toEqual({
			document:
				'query Parties($limit: Int) {\n  organizations(limit: $limit) {\n    name\n  }\n}',
			variables: '{\n  "limit": 2\n}',
		});
	});

	test('falls back to an empty or unparsable variables string', () => {
		expect(decodeState(toPlaygroundUrl('/graphql', '{ id }'))).toEqual({
			document: '{ id }',
			variables: '',
		});
		expect(
			decodeState(toPlaygroundUrl('/graphql', '{ id }', '{ not json')),
		).toEqual({
			document: '{ id }',
			variables: '{ not json',
		});
	});
});
