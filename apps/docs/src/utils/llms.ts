import typedefs from '@politigraph/graphql/dist/typedefs.graphql?raw';
import { getCollection } from 'astro:content';
import * as graphql from 'prettier/plugins/graphql';
import { format } from 'prettier/standalone';
import { sidebarGroups } from '../constants/sidebar';
import { SITE_URL } from '../constants/site';

export const schemaSdl = typedefs;

export const SUMMARY =
	'Politigraph is a public GraphQL API of Thai political open data - politicians, political parties, parliamentary positions, votes and bills - stored as a graph and maintained by WeVis.';

export const GRAPHQL_ENDPOINT = `${SITE_URL}/graphql`;

export const SCHEMA_URL = `${SITE_URL}/schema.graphql`;

export interface LlmsDoc {
	id: string;
	section: string;
	title: string;
	description?: string;
	url: string;
	markdownUrl: string;
	markdown: string;
}

const SECTION_LABELS = new Map(
	sidebarGroups.map(({ directory, translations }) => [
		directory,
		translations.en,
	]),
);

export async function getLlmsDocs(): Promise<LlmsDoc[]> {
	const entries = (await getCollection('docs'))
		.filter((entry) => entry.id.startsWith('en/'))
		.filter((entry) => entry.data.template !== 'splash')
		.sort(
			(a, b) =>
				(a.data.sidebar?.order ?? Number.MAX_SAFE_INTEGER) -
					(b.data.sidebar?.order ?? Number.MAX_SAFE_INTEGER) ||
				a.id.localeCompare(b.id),
		);

	return Promise.all(
		entries.map(async (entry) => {
			const [, section] = entry.id.split('/');
			const body = await toPlainMarkdown(entry.body ?? '');
			const url = `${SITE_URL}/${entry.id}`;

			return {
				id: entry.id,
				section: SECTION_LABELS.get(section ?? '') ?? 'Docs',
				title: entry.data.title,
				description: entry.data.description,
				url,
				markdownUrl: `${url}.md`,
				markdown: `# ${entry.data.title}\n\n${body}`,
			};
		}),
	);
}

export function toDocsLinkList(docs: LlmsDoc[]) {
	return [...new Set(docs.map((doc) => doc.section))]
		.map((section) => {
			const links = docs
				.filter((doc) => doc.section === section)
				.map(
					(doc) =>
						`- [${doc.title}](${doc.markdownUrl})${doc.description ? `: ${doc.description}` : ''}`,
				);

			return `## ${section}\n\n${links.join('\n')}`;
		})
		.join('\n\n');
}

async function toPlainMarkdown(body: string) {
	const withoutImports = body
		.replace(/^---\n[\s\S]*?\n---\n/, '')
		.replace(/^import .*$\n?/gm, '')
		.replace(/\$?\{SITE_URL\}/g, SITE_URL)
		.replace(
			/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
			(_, href, label: string) => `[${label.trim()}](${href})`,
		)
		.replace(
			/^:::([a-z]+)(?:\[(.*)\])?\n([\s\S]*?)^:::$/gm,
			(_, type: string, title: string | undefined, content: string) =>
				toBlockquote(type, title, content),
		);

	const withQueries = await replaceAsync(
		withoutImports,
		/<QueryTabs\b([\s\S]*?)\/>/g,
		(_, attributes: string) => toQueryExample(attributes),
	);

	return withQueries
		.replace(
			/<SchemaGraph\b[\s\S]*?\/>/g,
			`_The interactive schema diagram is not available in plain text. The complete GraphQL schema is at ${SCHEMA_URL}_`,
		)
		.replace(
			/<Code\b([^>]*)code=\{`([\s\S]*?)`\}([^>]*)\/>/g,
			(_, before: string, code: string, after: string) => {
				const title = getAttribute(`${before}${after}`, 'title');

				return `${title ? `**${title}**\n\n` : ''}\`\`\`\n${code.trim()}\n\`\`\``;
			},
		)
		.replace(/<code>([\s\S]*?)<\/code>/g, '`$1`')
		.replace(/<\/?[A-Z][^>]*>/g, '')
		.replace(/\]\(\/(?!\/)/g, `](${SITE_URL}/`)
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function toBlockquote(type: string, title = '', content: string) {
	const label = `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
	const heading = title ? `**${label}: ${title}**` : `**${label}**`;

	return [heading, '', ...content.trim().split('\n')]
		.map((line) => `> ${line}`.trimEnd())
		.join('\n');
}

async function toQueryExample(attributes: string) {
	const query = getAttribute(attributes, 'query');
	const variables = getAttribute(attributes, 'variables');

	if (!query) {
		return '';
	}

	const formattedQuery = await format(query, {
		parser: 'graphql',
		plugins: [graphql],
	});

	const blocks = [`\`\`\`graphql\n${formattedQuery.trim()}\n\`\`\``];

	if (variables) {
		blocks.push(
			`Variables:\n\n\`\`\`json\n${JSON.stringify(JSON.parse(variables), null, 2)}\n\`\`\``,
		);
	}

	return blocks.join('\n\n');
}

function getAttribute(attributes: string, name: string) {
	const match = attributes.match(
		new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`, 's'),
	);

	return match?.[1] ?? match?.[2];
}

async function replaceAsync(
	input: string,
	pattern: RegExp,
	replacer: (match: string, ...groups: string[]) => Promise<string>,
) {
	const replacements = await Promise.all(
		[...input.matchAll(pattern)].map((match) =>
			replacer(match[0], ...(match.slice(1) as string[])),
		),
	);

	let index = 0;

	return input.replace(pattern, () => replacements[index++] ?? '');
}
