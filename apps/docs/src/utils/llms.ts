import typedefs from '@politigraph/graphql/dist/typedefs.graphql?raw';
import { toPlaygroundUrl } from '@politigraph/graphql/playground-url';
import { getCollection } from 'astro:content';
import * as graphql from 'prettier/plugins/graphql';
import { format } from 'prettier/standalone';
import { sidebarGroups } from '../constants/sidebar';
import { GRAPHQL_ENDPOINT, SCHEMA_URL, SITE_URL } from '../constants/site';
import type { Language } from './i18n';

export const schemaSdl = typedefs;

export { SUMMARY } from '@politigraph/graphql/summary';

export interface LlmsDoc {
	id: string;
	lang: Language;
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

export function hasMarkdownVersion(entry: { data: { template?: string } }) {
	return entry.data.template !== 'splash';
}

export async function getLlmsDocs(): Promise<LlmsDoc[]> {
	const entries = (await getCollection('docs'))
		.filter(hasMarkdownVersion)
		.sort(
			(a, b) =>
				(a.data.sidebar?.order ?? Number.MAX_SAFE_INTEGER) -
					(b.data.sidebar?.order ?? Number.MAX_SAFE_INTEGER) ||
				a.id.localeCompare(b.id),
		);

	return Promise.all(
		entries.map(async (entry) => {
			const [first, ...rest] = entry.id.split('/');
			const isEnglish = first === 'en';
			const [section] = isEnglish ? rest : [first];
			const body = await toPlainMarkdown(entry.body ?? '');
			const url = `${SITE_URL}/${entry.id}`;

			return {
				id: entry.id,
				lang: isEnglish ? 'en' : 'th',
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

export async function getEnglishLlmsDocs() {
	return (await getLlmsDocs()).filter((doc) => doc.lang === 'en');
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
		.replace(/<summary>([\s\S]*?)<\/summary>/g, '**$1**')
		.replace(/<\/?details[^>]*>/g, '')
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

	const trimmedQuery = formattedQuery.trim();
	const blocks = [`\`\`\`graphql\n${trimmedQuery}\n\`\`\``];

	if (variables) {
		blocks.push(
			`Variables:\n\n\`\`\`json\n${JSON.stringify(JSON.parse(variables), null, 2)}\n\`\`\``,
		);
	}

	blocks.push(
		`[Run this query in the playground](${toPlaygroundUrl(GRAPHQL_ENDPOINT, trimmedQuery, variables)})`,
	);

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
