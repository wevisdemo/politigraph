import { initGraphqlNeo4j } from '~/utils/graphql/neo4j';
import { getGraphqlCreateIndexQueries } from '~/utils/graphql/schema';

export default defineNitroPlugin(async () => {
	if (!process.env.NEO4J_USERNAME || !process.env.NEO4J_PASSWORD) {
		console.info('[Neo4j] Credential env not found, skipping setup');
		return;
	}

	const { driver, neo4jgraphql } = initGraphqlNeo4j();

	await neo4jgraphql.getSchema();
	await neo4jgraphql.checkNeo4jCompat();
	await neo4jgraphql.assertIndexesAndConstraints();

	const queries = getGraphqlCreateIndexQueries();
	const session = driver.session();
	const tx = await session.beginTransaction();

	let createdIndexes = 0;

	for (const query of queries) {
		const result = await tx.run(query);
		createdIndexes += result.summary.counters.updates().indexesAdded;
	}

	await tx.commit();
	await session.close();
	await driver.close();

	console.info(`[Neo4j] ${createdIndexes}/${queries.length} indexes created`);
});
