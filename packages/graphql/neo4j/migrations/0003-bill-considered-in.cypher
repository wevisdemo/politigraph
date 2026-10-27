// Bill -[CREATED_IN]-> Organization is renamed to CONSIDERED_IN. Neo4j cannot rename a relationship type in place.

MATCH (bill:Bill)-[old:CREATED_IN]->(organization:Organization)
MERGE (bill)-[new:CONSIDERED_IN]->(organization)
SET new += properties(old);

MATCH (:Bill)-[old:CREATED_IN]->(:Organization)
DELETE old;
