export const QUERY_PARAM = 'query';

export const toQueryParam = (query: string) =>
	`?${QUERY_PARAM}=${encodeURIComponent(query)}`;
