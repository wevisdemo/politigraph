import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from 'bun:test';
import { type Session } from 'neo4j-driver';
import {
	buildSchema,
	cleanDatabase,
	driver,
	execute,
	seedPerson,
	seedVoteEvent,
} from './helpers';

const AUTHENTICATED = { jwtPayload: { sub: 'test-user' } };

describe('Relation properties', () => {
	let schema: Awaited<ReturnType<typeof buildSchema>>;
	let session: Session;

	beforeAll(async () => {
		schema = await buildSchema({ withAuth: true });
		session = driver.session();
	});

	afterAll(async () => {
		await session.close();
	});

	beforeEach(async () => {
		await cleanDatabase();
		await seedPerson(session, { id: 'p1', firstname: 'ก', lastname: 'ข' });
		await seedVoteEvent(session, { id: 've' });
	});

	test('are generated on connect in create, update and nested create mutations, and a repeated connect filtered on the single side adds no relationship', async () => {
		const connectVoteA = `{ connect: [{ where: { node: { option: { eq: "a" } } } }] }`;
		const connectP1ToVoteA = `mutation {
			updatePeople(
				where: { id: { eq: "p1" } },
				update: { votes: [{ connect: [{ where: { node: {
					option: { eq: "a" },
					NOT: { voter: { id: { eq: "p1" } } }
				} } }] }] }
			) { people { id } }
		}`;
		const mutations = [
			`mutation {
				updateVoteEvents(
					where: { id: { eq: "ve" } },
					update: { votes: [{ create: [{ node: { option: "a" } }] }] }
				) { voteEvents { id } }
			}`,
			connectP1ToVoteA,
			connectP1ToVoteA,
			`mutation {
				createOrganizations(input: [{
					id: "o1",
					name: "พรรคทดสอบ",
					classification: POLITICAL_PARTY,
					member_votes: ${connectVoteA}
				}]) { organizations { id } }
			}`,
		];

		for (const mutation of mutations) {
			const { errors } = await execute(schema, mutation, AUTHENTICATED);
			expect(errors).toBeUndefined();
		}

		const { records } = await session.run(
			`MATCH (:Vote)-[r:VOTED_BY|VOTED_IN|AFFILIATED_WITH]->()
			RETURN r.id AS id, valueType(r.created_at) AS createdAtType`,
		);
		const ids = records.map((record) => record.get('id'));

		expect(ids).toHaveLength(3);
		expect(new Set(ids).size).toBe(3);
		expect(ids).not.toContain(null);
		expect(
			new Set(records.map((record) => record.get('createdAtType'))),
		).toEqual(new Set(['ZONED DATETIME NOT NULL']));

		const { data, errors } = await execute(
			schema,
			`query { votes { voter { id } voterConnection { edges { properties { id created_at } } } } }`,
		);
		expect(errors).toBeUndefined();
		expect(data).toMatchObject({ votes: [{ voter: { id: 'p1' } }] });
	});
});
