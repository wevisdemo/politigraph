export const QUERY_PARAM = 'query';

export const NODE_PARAM = 'node';

export const toNodeParam = (typename: string) => `?${NODE_PARAM}=${typename}`;

export const toQueryParam = (query: string) =>
	`?${QUERY_PARAM}=${encodeURIComponent(query)}`;
