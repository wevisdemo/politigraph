import * as graphql from 'prettier/plugins/graphql';
import { format } from 'prettier/standalone';
import { codeToHtml } from 'shiki';

export function useFormattedGraphqlCode(
	query: string,
	variables: Record<string, unknown>,
	response: Ref<Record<string, unknown> | null>,
) {
	return useAsyncData(
		`graphql/formatter/${query}`,
		async () => ({
			query: await codeToHtml(await formatQuery(query), {
				lang: 'graphql',
				theme: 'catppuccin-latte',
			}),
			variables: await codeToHtml(formatJson(variables), {
				lang: 'json',
				theme: 'catppuccin-latte',
			}),
			response: await codeToHtml(
				formatJson(response.value ?? {})
					.split('\n')
					.filter((line) => !line.includes('__typename'))
					.join('\n'),
				{
					lang: 'json',
					theme: 'catppuccin-mocha',
				},
			),
		}),
		{ watch: [response] },
	);
}

function formatQuery(str: string) {
	return format(str, {
		parser: 'graphql',
		plugins: [graphql],
	});
}

function formatJson(obj: Record<string, unknown>) {
	return JSON.stringify(obj, undefined, 2);
}
