import { Neo4jGraphQL } from '@neo4j/graphql';
import {
	GraphQLError,
	execute as graphqlExecute,
	parse,
	validate,
} from 'graphql';
import { type Session } from 'neo4j-driver';
import { excludeDeprecatedFields } from '../../deprecated-fields';
import { resolvers } from '../../domains/resolvers';
import { getGraphqlTypeDefs } from '../../domains/type-defs';
import { driver } from '../../neo4j/driver';
import { populatedBy } from '../../populated-by';
import { hideUnpublishedInFilters } from '../../support/hide-unpublished-filters';

export { driver };

const TEST_AUTH_KEY = 'test-secret-key-for-integration-tests';

export async function cleanDatabase() {
	const session = driver.session();
	try {
		await session.run('MATCH (n) WHERE NOT n:__Migration DETACH DELETE n');
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
			populatedBy,
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
): Promise<{ data?: Record<string, unknown>; errors?: readonly unknown[] }> {
	const contextValue: Record<string, unknown> = {};

	if (jwtPayload) {
		contextValue.jwt = jwtPayload;
	}

	const builtSchema = await schema.getSchema();
	const document = parse(source);
	const validationErrors = validate(builtSchema, document);

	if (validationErrors.length) return { errors: validationErrors };

	try {
		return (await graphqlExecute({
			schema: builtSchema,
			document: jwtPayload
				? document
				: hideUnpublishedInFilters(builtSchema, document, variables),
			variableValues: variables,
			contextValue,
		})) as { data?: Record<string, unknown>; errors?: unknown[] };
	} catch (error) {
		if (error instanceof GraphQLError) return { errors: [error] };

		throw error;
	}
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
		memberIds,
		start_date = '2024-01-01',
	}: {
		id: string;
		memberIds: string[];
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
		UNWIND $memberIds AS memberId
		MATCH (p {id: memberId})
		CREATE (p)-[:HELD]->(m)`,
		{ id, memberIds, start_date },
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
