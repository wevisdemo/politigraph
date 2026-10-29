import { PARLIAMENT_WATCH_URL } from './parliament-watch';

export const SUMMARY =
	'Politigraph is a public GraphQL API of Thai political open data - politicians, political parties, parliamentary positions, votes and bills - stored as a graph and maintained by WeVis.';

export const SCHEMA_FIRST_NOTE =
	'Read the schema, in full or just the types involved, before writing any query, and never guess type, field or enum names. If you cannot read the schema, a query fails, or the data does not answer the question, tell the user plainly what went wrong instead of guessing or answering from memory.';

export const REFERENCES_NOTE = `When answering about specific nodes, select their \`id\` and \`links { url note }\`. Cite the \`links\` URLs as sources and, when it fits the question, also link the Parliament Watch page given in the node \`id\` description, built from the returned \`id\` (URL-encoded). For questions about how a politician voted, link their voting history page (${PARLIAMENT_WATCH_URL}/politicians/{id}/votes). For general questions you can also link Parliament Watch itself: how a bill becomes law (${PARLIAMENT_WATCH_URL}/legislative-process), browsing bills in detail (${PARLIAMENT_WATCH_URL}/bills/explore) or its landing page (${PARLIAMENT_WATCH_URL}). Never invent a URL.`;

export const TIMESTAMP_FIELD_NOTE =
	'Internal system field, not the date of any real-world event. Use the domain-specific date fields instead.';

export const TIMESTAMP_NOTE =
	'`created_at` and `updated_at` are internal system fields recording when a record was added to or edited in the database. Never use them to answer when something happened; use the domain-specific date fields instead.';
