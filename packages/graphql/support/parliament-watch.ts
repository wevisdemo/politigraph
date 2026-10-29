export const PARLIAMENT_WATCH_URL = 'https://parliamentwatch.wevis.info';

export const PARLIAMENT_WATCH_ID_NOTES: Record<string, string> = {
	Person: `Parliament Watch page: ${PARLIAMENT_WATCH_URL}/politicians/{id}, and its voting history: ${PARLIAMENT_WATCH_URL}/politicians/{id}/votes`,
	Bill: `Parliament Watch page: ${PARLIAMENT_WATCH_URL}/bills/{id}`,
	VoteEvent: `Parliament Watch page: ${PARLIAMENT_WATCH_URL}/votings/{id}, and how each member voted: ${PARLIAMENT_WATCH_URL}/votings/{id}/votes`,
	Organization: `Parliament Watch pages exist only for parliamentary terms: ${PARLIAMENT_WATCH_URL}/assemblies/{id}, its vote events: ${PARLIAMENT_WATCH_URL}/assemblies/{id}/votes, and for a House of Representatives term also its bills at ${PARLIAMENT_WATCH_URL}/bills/term/{id}`,
};
