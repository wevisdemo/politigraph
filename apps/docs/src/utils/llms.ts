import typedefs from '@politigraph/graphql/dist/typedefs.graphql?raw';
import { toPlaygroundUrl } from '@politigraph/graphql/playground-url';
import {
	REFERENCES_NOTE,
	SCHEMA_FIRST_NOTE,
	SUMMARY,
	TIMESTAMP_NOTE,
} from '@politigraph/graphql/summary';
import { getCollection } from 'astro:content';
import * as graphql from 'prettier/plugins/graphql';
import { format } from 'prettier/standalone';
import { sidebarGroups } from '../constants/sidebar';
import {
	GRAPHQL_ENDPOINT,
	MCP_ENDPOINT,
	PLAYGROUND_ENDPOINT,
	SCHEMA_URL,
	SITE_URL,
} from '../constants/site';
import type { Language } from './i18n';

export const schemaSdl = typedefs;

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

const SECTION_LABELS: Record<Language, Map<string, string>> = {
	en: new Map([
		...sidebarGroups.map(
			({ directory, translations }) =>
				[directory, translations.en] as [string, string],
		),
		['changelog', 'Changelog'],
	]),
	th: new Map([
		...sidebarGroups.map(
			({ directory, label }) => [directory, label] as [string, string],
		),
		['changelog', 'บันทึกการเปลี่ยนแปลง'],
	]),
};

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
			const lang: Language = first === 'en' ? 'en' : 'th';
			const [section] = lang === 'en' ? rest : [first];
			const body = await toPlainMarkdown(entry.body ?? '');
			const url = `${SITE_URL}/${entry.id}`;

			return {
				id: entry.id,
				lang,
				section: SECTION_LABELS[lang].get(section ?? '') ?? 'Docs',
				title: entry.data.title,
				description: entry.data.description,
				url,
				markdownUrl: `${url}.md`,
				markdown: `# ${entry.data.title}\n\n${body}`,
			};
		}),
	);
}

export async function getLlmsDocsByLanguage(lang: Language) {
	return (await getLlmsDocs()).filter((doc) => doc.lang === lang);
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

const LLMS_LANGUAGES = {
	en: {
		name: 'English',
		indexUrl: `${SITE_URL}/llms.txt`,
		fullUrl: `${SITE_URL}/llms-full.txt`,
		exploreUrl: `${SITE_URL}/en/explore`,
		otherNote: `These files are generated from the English documentation. The Thai originals are the source of truth and use the exact Thai terms of the data: if the user writes in Thai or asks about a Thai term, read ${SITE_URL}/llms-th.txt instead.`,
	},
	th: {
		name: 'Thai',
		indexUrl: `${SITE_URL}/llms-th.txt`,
		fullUrl: `${SITE_URL}/llms-full-th.txt`,
		exploreUrl: `${SITE_URL}/explore`,
		otherNote: `These files are the original Thai documentation, the source of truth for the Thai terms used in the data. The English translation is at ${SITE_URL}/llms.txt.`,
	},
} satisfies Record<Language, Record<string, string>>;

export async function toLlmsIndex(lang: Language) {
	const docs = await getLlmsDocsByLanguage(lang);
	const { fullUrl, exploreUrl, otherNote } = LLMS_LANGUAGES[lang];

	return `# Politigraph

> ${SUMMARY}

- Query the API by sending a POST request to ${GRAPHQL_ENDPOINT}, or explore it interactively in the playground at the same URL.
- MCP-capable agents can connect to ${MCP_ENDPOINT} instead, an anonymous read-only Streamable HTTP endpoint with tools to read the schema and run queries.
- If you cannot run the query yourself, hand the user a link to ${PLAYGROUND_ENDPOINT}?query=URL_ENCODED_GRAPHQL&variables=URL_ENCODED_JSON instead. It opens the playground with that operation and its variables filled in, ready to run.
- Every page below is also available as plain markdown by appending \`.md\` to its URL.
- ${SCHEMA_FIRST_NOTE} The complete schema is linked under Reference below.
- ${REFERENCES_NOTE}
- ${TIMESTAMP_NOTE}
- ${otherNote}

${toDocsLinkList(docs)}

## Reference

- [Complete GraphQL schema](${SCHEMA_URL}): full SDL of every node type, property and relationship. Read it before writing queries.

## Optional

- [All documentation in one file](${fullUrl}): every page above plus the schema, for one-shot context
- [Explore](${exploreUrl}): interactive graph browser for humans
- [Source code](https://github.com/wevisdemo/politigraph): report data errors or issues here
`;
}

export async function toLlmsFull(lang: Language) {
	const docs = await getLlmsDocsByLanguage(lang);

	return `# Politigraph

> ${SUMMARY} Query it by sending a POST request to ${GRAPHQL_ENDPOINT}.

If you cannot run the query yourself, hand the user a link to ${PLAYGROUND_ENDPOINT}?query=URL_ENCODED_GRAPHQL&variables=URL_ENCODED_JSON instead. It opens the playground with that operation and its variables filled in, ready to run.

This file contains the complete ${LLMS_LANGUAGES[lang].name} documentation followed by the full GraphQL schema.

${docs.map((doc) => doc.markdown).join('\n\n---\n\n')}

---

# GraphQL Schema

\`\`\`graphql
${schemaSdl.trim()}
\`\`\`
`;
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
