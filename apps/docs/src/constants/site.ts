const DEV_SITE_URL = 'http://localhost:4321';
export const SITE_URL =
	import.meta.env.PUBLIC_SITE_URL ||
	(import.meta.env.DEV ? DEV_SITE_URL : import.meta.env.SITE);

export const GRAPHQL_ENDPOINT = `${SITE_URL}/graphql`;
export const MCP_ENDPOINT = `${SITE_URL}/mcp`;
export const PLAYGROUND_ENDPOINT = `${SITE_URL}/playground`;
export const SCHEMA_URL = `${SITE_URL}/schema.graphql`;
