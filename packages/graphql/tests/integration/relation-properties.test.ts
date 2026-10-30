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

const connectById = (id: string) =>
	`{ connect: [{ where: { node: { id: { eq: "${id}" } } } }] }`;

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
		await seedPerson(session, { id: 'p2', firstname: 'ค', lastname: 'ง' });
		await seedVoteEvent(session, { id: 've' });
	});

	test('are generated on connect in create, update and nested create mutations', async () => {
		const mutations = [
			`mutation {
				createVotes(input: [{
					option: "a",
					voters: ${connectById('p1')},
					vote_events: ${connectById('ve')}
				}]) { votes { id } }
			}`,
			`mutation {
				updateVotes(
					where: { option: { eq: "a" } },
					update: { voters: [${connectById('p2')}] }
				) { votes { id } }
			}`,
			`mutation {
				updateVoteEvents(
					where: { id: { eq: "ve" } },
					update: { votes: [{ create: [{ node: { option: "b", voters: ${connectById('p1')} } }] }] }
				) { voteEvents { id } }
			}`,
		];

		for (const mutation of mutations) {
			const { errors } = await execute(schema, mutation, AUTHENTICATED);
			expect(errors).toBeUndefined();
		}

		const { records } = await session.run(
			`MATCH (:Vote)-[r:VOTED_BY|VOTED_IN]->()
			RETURN r.id AS id, valueType(r.created_at) AS createdAtType`,
		);
		const ids = records.map((record) => record.get('id'));

		expect(ids).toHaveLength(5);
		expect(new Set(ids).size).toBe(5);
		expect(ids).not.toContain(null);
		expect(
			new Set(records.map((record) => record.get('createdAtType'))),
		).toEqual(new Set(['ZONED DATETIME NOT NULL']));

		const { errors } = await execute(
			schema,
			`query { votes { votersConnection { edges { properties { id created_at } } } } }`,
		);
		expect(errors).toBeUndefined();
	});
});
