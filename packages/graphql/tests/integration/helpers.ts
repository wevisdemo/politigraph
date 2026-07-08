import { Neo4jGraphQL } from '@neo4j/graphql';
import { graphql } from 'graphql';
import neo4j, { type Session } from 'neo4j-driver';
import { resolvers } from '../../custom-resolvers';
import { excludeDeprecatedFields } from '../../deprecated-fields';
import { getGraphqlTypeDefs } from '../../schema';

const uri = process.env.NEO4J_TEST_URI ?? 'neo4j://127.0.0.1:7688';
const username = process.env.NEO4J_TEST_USERNAME ?? 'neo4j';
const password = process.env.NEO4J_TEST_PASSWORD ?? 'testpassword';

export const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

const TEST_AUTH_KEY = 'test-secret-key-for-integration-tests';

export async function cleanDatabase() {
	const session = driver.session();
	try {
		await session.run('MATCH (n) DETACH DELETE n');
	} finally {
		await session.close();
	}
}

export async function buildSchema({ withAuth = false } = {}) {
	const typeDefs = await getGraphqlTypeDefs();

	return new Neo4jGraphQL({
		typeDefs,
		driver,
		resolvers,
		features: {
			...(withAuth
				? {
						authorization: {
							key: TEST_AUTH_KEY,
						},
					}
				: {}),
			excludeDeprecatedFields,
		},
	});
}

export async function execute(
	schema: Awaited<ReturnType<typeof buildSchema>>,
	source: string,
	{
		variables,
		jwtPayload,
	}: {
		variables?: Record<string, unknown>;
		jwtPayload?: Record<string, unknown>;
	} = {},
) {
	const contextValue: Record<string, unknown> = {};

	if (jwtPayload) {
		contextValue.jwt = jwtPayload;
	}

	const result = await graphql({
		schema: await schema.getSchema(),
		source,
		variableValues: variables,
		contextValue,
	});

	return result as { data?: Record<string, unknown>; errors?: unknown[] };
}

export async function seedPerson(
	session: Session,
	{
		id,
		prefix = 'นาย',
		firstname,
		lastname,
		publish_status = 'PUBLISHED',
	}: {
		id: string;
		prefix?: string;
		firstname: string;
		lastname: string;
		publish_status?: string;
	},
) {
	await session.run(
		`CREATE (p:Person {
			id: $id,
			prefix: $prefix,
			firstname: $firstname,
			middlename: null,
			lastname: $lastname,
			publish_status: $publish_status,
			created_at: datetime(),
			updated_at: datetime()
		}) RETURN p`,
		{ id, prefix, firstname, lastname, publish_status },
	);
}

export async function seedOrganization(
	session: Session,
	{
		id,
		name,
		classification = 'POLITICAL_PARTY',
	}: {
		id: string;
		name: string;
		classification?: string;
	},
) {
	await session.run(
		`CREATE (o:Organization {
			id: $id,
			name: $name,
			classification: $classification,
			created_at: datetime(),
			updated_at: datetime()
		}) RETURN o`,
		{ id, name, classification },
	);
}

export async function seedPost(
	session: Session,
	{
		id,
		role,
		organizationId,
	}: {
		id: string;
		role: string;
		organizationId: string;
	},
) {
	await session.run(
		`CREATE (p:Post {
			id: $id,
			role: $role,
			created_at: datetime(),
			updated_at: datetime()
		})
		WITH p
		MATCH (o:Organization {id: $organizationId})
		CREATE (p)-[:IN]->(o)
		RETURN p`,
		{ id, role, organizationId },
	);
}

export async function seedVoteEvent(
	session: Session,
	{
		id,
		title = 'Test Vote Event',
		start_date = '2024-01-01',
		end_date = '2024-01-01',
		publish_status = 'PUBLISHED',
	}: {
		id: string;
		title?: string;
		start_date?: string;
		end_date?: string;
		publish_status?: string;
	},
) {
	await session.run(
		`CREATE (ve:VoteEvent {
			id: $id,
			title: $title,
			start_date: date($start_date),
			end_date: date($end_date),
			publish_status: $publish_status,
			created_at: datetime(),
			updated_at: datetime()
		}) RETURN ve`,
		{ id, title, start_date, end_date, publish_status },
	);
}

export async function seedVote(
	session: Session,
	{
		id,
		option = 'เห็นด้วย',
		voteEventId,
		personId,
	}: {
		id: string;
		option?: string;
		voteEventId: string;
		personId?: string;
	},
) {
	const query = personId
		? `CREATE (v:Vote {
				id: $id,
				option: $option,
				created_at: datetime(),
				updated_at: datetime()
			})
			WITH v
			MATCH (ve:VoteEvent {id: $voteEventId})
			CREATE (v)-[:VOTED_IN]->(ve)
			WITH v
			MATCH (p:Person {id: $personId})
			CREATE (v)-[:VOTED_BY]->(p)
			RETURN v`
		: `CREATE (v:Vote {
				id: $id,
				option: $option,
				created_at: datetime(),
				updated_at: datetime()
			})
			WITH v
			MATCH (ve:VoteEvent {id: $voteEventId})
			CREATE (v)-[:VOTED_IN]->(ve)
			RETURN v`;

	await session.run(query, { id, option, voteEventId, personId });
}

export async function seedMembership(
	session: Session,
	{
		id,
		personId,
		start_date = '2024-01-01',
	}: {
		id: string;
		personId: string;
		start_date?: string;
	},
) {
	await session.run(
		`CREATE (m:Membership {
			id: $id,
			start_date: date($start_date),
			created_at: datetime(),
			updated_at: datetime()
		})
		WITH m
		MATCH (p:Person {id: $personId})
		CREATE (p)-[:HELD]->(m)
		RETURN m`,
		{ id, personId, start_date },
	);
}

export async function seedLink(
	session: Session,
	{
		id,
		url,
		ownerIds,
	}: {
		id: string;
		url: string;
		ownerIds: string[];
	},
) {
	await session.run(
		`CREATE (l:Link {
			id: $id,
			url: $url,
			created_at: datetime(),
			updated_at: datetime()
		})
		WITH l
		UNWIND $ownerIds AS ownerId
		MATCH (o {id: ownerId})
		CREATE (o)-[:HAVE]->(l)
		RETURN l`,
		{ id, url, ownerIds },
	);
}
