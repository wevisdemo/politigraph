import { neo4jConfig } from '@politigraph/config/neo4j';
import neo4j from 'neo4j-driver';

export const driver = neo4j.driver(
	neo4jConfig.uri,
	neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password),
);
