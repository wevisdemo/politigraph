// Relationships made with `connect` never got their Relation properties. The real creation time was not stored, so created_at is approximated from the source node.

MATCH (source)-[relation:AS|CONSIDERED_IN|CO_CREATED_BY|CREATED_BY|HAS_VOTE_EVENT|HAVE|HELD|HELD_EVENT|IN|KNOWN_AS|UNDER|VOTED_BY|VOTED_IN]->()
WHERE relation.id IS NULL OR relation.created_at IS NULL
CALL (source, relation) {
	SET relation.id = coalesce(relation.id, randomUUID()),
		relation.created_at = coalesce(
			relation.created_at,
			CASE WHEN source.created_at IS :: STRING THEN datetime(source.created_at) ELSE source.created_at END,
			datetime()
		)
} IN TRANSACTIONS OF 5000 ROWS;
