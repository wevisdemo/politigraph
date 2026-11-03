// Senators are matched per vote: walking a Senate org's events while batches add AFFILIATED_WITH to it skipped events once its relationships switched to dense storage.

MATCH (vote:Vote) WHERE vote.voter_party IS NOT NULL
CALL (vote) {
	SET vote.voter_affiliation_raw = vote.voter_party
	REMOVE vote.voter_party
} IN TRANSACTIONS OF 5000 ROWS;

MATCH (vote:Vote) WHERE vote.voter_affiliation_raw IS NOT NULL
CALL (vote) {
	MATCH (party:Organization {classification: 'POLITICAL_PARTY', name: vote.voter_affiliation_raw})
	MERGE (vote)-[relation:AFFILIATED_WITH]->(party)
	ON CREATE SET relation.id = randomUUID(), relation.created_at = datetime()
} IN TRANSACTIONS OF 5000 ROWS;

MATCH (vote:Vote {voter_affiliation_raw: 'สมาชิกวุฒิสภา'})
CALL (vote) {
	MATCH (vote)-[:VOTED_IN]->(:VoteEvent)<-[:HELD_EVENT]-(senate:Organization {classification: 'HOUSE_OF_SENATE'})
	MERGE (vote)-[relation:AFFILIATED_WITH]->(senate)
	ON CREATE SET relation.id = randomUUID(), relation.created_at = datetime()
} IN TRANSACTIONS OF 5000 ROWS;
