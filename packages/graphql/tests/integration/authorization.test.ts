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
	seedLink,
	seedMembership,
	seedOrganization,
	seedPerson,
	seedPost,
	seedVote,
	seedVoteEvent,
} from './helpers';

describe('Authorization filters', () => {
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
	});

	describe('Person', () => {
		test('anonymous query returns only PUBLISHED people', async () => {
			await seedPerson(session, {
				id: 'person-published',
				firstname: 'สมชาย',
				lastname: 'ใจดี',
				publish_status: 'PUBLISHED',
			});
			await seedPerson(session, {
				id: 'person-unpublished',
				firstname: 'สมหญิง',
				lastname: 'รักสุข',
				publish_status: 'UNPUBLISHED',
			});

			const result = await execute(
				schema,
				`
				query {
					people {
						id
						publish_status
					}
				}
			`,
			);

			expect(result.errors).toBeUndefined();
			const data = result.data as {
				people: { id: string; publish_status: string }[];
			};
			expect(data.people).toHaveLength(1);
			expect(data.people[0]!.id).toBe('person-published');
		});

		test('authenticated query returns all people', async () => {
			await seedPerson(session, {
				id: 'person-published',
				firstname: 'สมชาย',
				lastname: 'ใจดี',
				publish_status: 'PUBLISHED',
			});
			await seedPerson(session, {
				id: 'person-unpublished',
				firstname: 'สมหญิง',
				lastname: 'รักสุข',
				publish_status: 'UNPUBLISHED',
			});

			const result = await execute(
				schema,
				`
					query {
						people {
							id
							publish_status
						}
					}
				`,
				{ jwtPayload: { sub: 'test-user' } },
			);

			expect(result.errors).toBeUndefined();
			const data = result.data as {
				people: { id: string; publish_status: string }[];
			};
			expect(data.people).toHaveLength(2);
			const ids = data.people.map((p) => p.id).sort();
			expect(ids).toEqual(['person-published', 'person-unpublished']);
		});
	});

	describe('VoteEvent', () => {
		test('anonymous query returns only PUBLISHED vote events', async () => {
			await seedVoteEvent(session, {
				id: 've-published',
				title: 'Published Event',
				publish_status: 'PUBLISHED',
			});
			await seedVoteEvent(session, {
				id: 've-unpublished',
				title: 'Unpublished Event',
				publish_status: 'UNPUBLISHED',
			});

			const result = await execute(
				schema,
				`
				query {
					voteEvents {
						id
						publish_status
					}
				}
			`,
			);

			expect(result.errors).toBeUndefined();
			const data = result.data as {
				voteEvents: { id: string; publish_status: string }[];
			};
			expect(data.voteEvents).toHaveLength(1);
			expect(data.voteEvents[0]!.id).toBe('ve-published');
		});
	});

	describe('Vote', () => {
		test('anonymous query returns only votes linked to PUBLISHED events', async () => {
			await seedVoteEvent(session, {
				id: 've-published',
				title: 'Published Event',
				publish_status: 'PUBLISHED',
			});
			await seedVoteEvent(session, {
				id: 've-unpublished',
				title: 'Unpublished Event',
				publish_status: 'UNPUBLISHED',
			});
			await seedVote(session, {
				id: 'vote-published',
				option: 'เห็นด้วย',
				voteEventId: 've-published',
			});
			await seedVote(session, {
				id: 'vote-unpublished',
				option: 'ไม่เห็นด้วย',
				voteEventId: 've-unpublished',
			});
			await session.run(
				`CREATE (:Vote { id: 'vote-unlinked', option: 'เห็นด้วย', created_at: datetime() })`,
			);

			const result = await execute(
				schema,
				`
				query {
					votes {
						id
					}
				}
			`,
			);

			expect(result.errors).toBeUndefined();
			const data = result.data as { votes: { id: string }[] };
			expect(data.votes).toHaveLength(1);
			expect(data.votes[0]!.id).toBe('vote-published');
		});
	});

	describe('Link', () => {
		test('anonymous users see every link except those owned by an UNPUBLISHED node', async () => {
			await seedPerson(session, {
				id: 'person-unpublished',
				firstname: 'สมหญิง',
				lastname: 'รักสุข',
				publish_status: 'UNPUBLISHED',
			});
			await seedPerson(session, {
				id: 'person-published',
				firstname: 'สมชาย',
				lastname: 'ใจดี',
				publish_status: 'PUBLISHED',
			});
			await seedOrganization(session, {
				id: 'org-1',
				name: 'Test Organization',
			});
			await seedVoteEvent(session, { id: 've-1' });
			await seedVoteEvent(session, {
				id: 've-unpublished',
				publish_status: 'UNPUBLISHED',
			});
			await seedMembership(session, {
				id: 'membership-unpublished',
				memberIds: ['person-unpublished'],
			});
			const billEventLabels = [
				'BillVoteEvent',
				'BillMergeEvent',
				'BillEnactEvent',
				'BillRejectEvent',
				'BillRoyalAssentEvent',
			];
			for (const label of billEventLabels) {
				await session.run(
					`CREATE (:${label} {id: $id, publish_status: 'UNPUBLISHED'})`,
					{ id: `${label}-unpublished` },
				);
			}
			await session.run(
				`CREATE (:BillVoteEvent {id: 'bve-published', publish_status: 'PUBLISHED'})`,
			);
			const owners = {
				...Object.fromEntries(
					billEventLabels.map((label) => [
						`link-hidden-${label}`,
						[`${label}-unpublished`],
					]),
				),
				'link-hidden': ['person-unpublished'],
				'link-hidden-membership': ['membership-unpublished'],
				'link-hidden-vote-event': ['ve-unpublished'],
				'link-bill-event': ['bve-published'],
				'link-person': ['person-published'],
				'link-org': ['org-1'],
				'link-vote-event': ['ve-1'],
				'link-ownerless': [],
			};
			for (const [id, ownerIds] of Object.entries(owners)) {
				await seedLink(session, {
					id,
					url: `https://example.com/${id}`,
					ownerIds,
				});
			}

			const result = await execute(
				schema,
				`
				query {
					links(sort: { id: ASC }) {
						id
					}
				}
			`,
			);

			expect(result.errors).toBeUndefined();
			const data = result.data as { links: { id: string }[] };
			expect(data.links.map(({ id }) => id)).toEqual([
				'link-bill-event',
				'link-org',
				'link-ownerless',
				'link-person',
				'link-vote-event',
			]);
		});
	});

	describe('Bill events and alternate names', () => {
		const billEventQueries = [
			['BillVoteEvent', 'billVoteEvents'],
			['BillMergeEvent', 'billMergeEvents'],
			['BillEnactEvent', 'billEnactEvents'],
			['BillRejectEvent', 'billRejectEvents'],
			['BillRoyalAssentEvent', 'billRoyalAssentEvents'],
		] as const;

		const seedHiddenAndVisible = async () => {
			for (const [label] of billEventQueries) {
				await session.run(
					`CREATE (:${label} {id: $hidden, publish_status: 'UNPUBLISHED'}), (:${label} {id: $visible, publish_status: 'PUBLISHED'})`,
					{ hidden: `${label}-hidden`, visible: `${label}-visible` },
				);
			}
			await seedPerson(session, {
				id: 'person-hidden',
				firstname: 'สมหญิง',
				lastname: 'รักสุข',
				publish_status: 'UNPUBLISHED',
			});
			await seedPerson(session, {
				id: 'person-visible',
				firstname: 'สมชาย',
				lastname: 'ใจดี',
			});
			await session.run(
				`MATCH (h:Person {id: 'person-hidden'}), (v:Person {id: 'person-visible'})
				CREATE (:AlternatePersonName {id: 'name-hidden', firstname: 'a', lastname: 'b'})<-[:KNOWN_AS]-(h),
					(:AlternatePersonName {id: 'name-visible', firstname: 'a', lastname: 'b'})<-[:KNOWN_AS]-(v)`,
			);
		};

		test('anonymous users only see PUBLISHED bill events and names of PUBLISHED people', async () => {
			await seedHiddenAndVisible();

			const result = await execute(
				schema,
				`query {
					${billEventQueries.map(([, field]) => `${field}(sort: { id: ASC }) { id }`).join('\n')}
					alternatePersonNames { id }
				}`,
			);

			expect(result.errors).toBeUndefined();
			expect(result.data).toEqual({
				...Object.fromEntries(
					billEventQueries.map(([label, field]) => [
						field,
						[{ id: `${label}-visible` }],
					]),
				),
				alternatePersonNames: [{ id: 'name-visible' }],
			});
		});

		test('authenticated users see hidden bill events and names', async () => {
			await seedHiddenAndVisible();

			const result = await execute(
				schema,
				`query {
					billVoteEvents(sort: { id: ASC }) { id }
					alternatePersonNames(sort: { id: ASC }) { id }
				}`,
				{ jwtPayload: { sub: 'test-user' } },
			);

			expect(result.errors).toBeUndefined();
			expect(result.data).toEqual({
				billVoteEvents: [
					{ id: 'BillVoteEvent-hidden' },
					{ id: 'BillVoteEvent-visible' },
				],
				alternatePersonNames: [{ id: 'name-hidden' }, { id: 'name-visible' }],
			});
		});
	});

	describe('Relationship filters', () => {
		beforeEach(async () => {
			await seedPerson(session, {
				id: 'person-hidden',
				firstname: 'สมหญิง',
				lastname: 'รักสุข',
				publish_status: 'UNPUBLISHED',
			});
			await seedPerson(session, {
				id: 'person-visible',
				firstname: 'สมชาย',
				lastname: 'ใจดี',
			});
			await seedVoteEvent(session, {
				id: 've-hidden',
				title: 'secret',
				publish_status: 'UNPUBLISHED',
			});
			await seedVoteEvent(session, { id: 've-visible', title: 'open' });
			await seedVote(session, {
				id: 'vote-hidden-voter',
				voteEventId: 've-visible',
				personId: 'person-hidden',
			});
			await seedVote(session, {
				id: 'vote-visible-voter',
				voteEventId: 've-visible',
				personId: 'person-visible',
			});
			await seedOrganization(session, { id: 'org-1', name: 'Org' });
			await seedPost(session, {
				id: 'post-hidden',
				role: 'hidden member',
				organizationId: 'org-1',
			});
			await seedPost(session, {
				id: 'post-visible',
				role: 'visible member',
				organizationId: 'org-1',
			});
			await seedMembership(session, {
				id: 'membership-hidden',
				memberIds: ['person-hidden'],
			});
			await seedMembership(session, {
				id: 'membership-visible',
				memberIds: ['person-visible'],
			});
			await session.run(`
				MATCH (m:Membership {id: 'membership-hidden'}), (p:Post {id: 'post-hidden'})
				CREATE (m)-[:AS]->(p)
				WITH 1 AS x
				MATCH (m:Membership {id: 'membership-visible'}), (p:Post {id: 'post-visible'})
				CREATE (m)-[:AS]->(p)
				WITH 1 AS x
				MATCH (h:VoteEvent {id: 've-hidden'}), (v:VoteEvent {id: 've-visible'})
				CREATE (:BillVoteEvent {id: 'bve', publish_status: 'PUBLISHED'})-[:HAS_VOTE_EVENT {id: 'edge-hidden'}]->(h),
					(:BillVoteEvent {id: 'bve-visible-only', publish_status: 'PUBLISHED'})-[:HAS_VOTE_EVENT {id: 'edge-visible'}]->(v),
					(:Bill {id: 'bill-hidden-event'})<-[:IN]-(:BillVoteEvent {id: 'bve-hidden', publish_status: 'UNPUBLISHED'}),
					(:Bill {id: 'bill-visible-event'})<-[:IN]-(:BillVoteEvent {id: 'bve-visible', publish_status: 'PUBLISHED'})
			`);
		});

		const hiddenOracles = {
			singleStatus: `votes(where: { voter: { publish_status: { eq: UNPUBLISHED } } })`,
			singleField: `votes(where: { voter: { firstname: { startsWith: "สมหญิง" } } })`,
			unionQuantifier: `posts(where: { memberships: { some: { member: { Person: { publish_status: { eq: UNPUBLISHED } } } } } })`,
			list: `billVoteEvents(where: { vote_events: { some: { title: { startsWith: "secret" } } } })`,
			connection: `votes(where: { voterConnection: { node: { publish_status: { eq: UNPUBLISHED } } } })`,
			edgeOnly: `billVoteEvents(where: { vote_eventsConnection: { some: { edge: { id: { eq: "edge-hidden" } } } } })`,
		};

		test('anonymous cannot probe hidden nodes through relationship filters', async () => {
			const result = await execute(
				schema,
				`query {
					${Object.entries(hiddenOracles)
						.map(([alias, field]) => `${alias}: ${field} { id }`)
						.join('\n')}
				}`,
			);

			expect(result.errors).toBeUndefined();
			expect(result.data).toEqual(
				Object.fromEntries(Object.keys(hiddenOracles).map((key) => [key, []])),
			);
		});

		test('anonymous variables, defaults and the all quantifier ignore hidden nodes', async () => {
			const hiddenVoter = `query ($voter: PersonWhere = { publish_status: { eq: UNPUBLISHED } }) {
				votes(where: { voter: $voter }) { id }
			}`;
			const [viaVariable, viaDefault, viaOmitted, viaAll, viaUnionAll] =
				await Promise.all([
					execute(schema, hiddenVoter, {
						variables: { voter: { publish_status: { eq: 'UNPUBLISHED' } } },
					}),
					execute(schema, hiddenVoter),
					execute(
						schema,
						`query ($voter: PersonWhere) {
							votes(where: { voter: $voter }, sort: { id: ASC }) { id }
						}`,
					),
					execute(
						schema,
						`query {
							billVoteEvents(
								where: { vote_events: { all: { title: { eq: "open" } } } }
								sort: { id: ASC }
							) { id }
						}`,
					),
					execute(
						schema,
						`query {
							bills(
								where: { events: { all: { BillVoteEvent: { id: { startsWith: "bve-v" } } } } }
								sort: { id: ASC }
							) { id }
						}`,
					),
				]);

			expect(viaVariable.data).toEqual({ votes: [] });
			expect(viaDefault.data).toEqual({ votes: [] });
			expect(viaOmitted.data).toEqual({
				votes: [{ id: 'vote-hidden-voter' }, { id: 'vote-visible-voter' }],
			});
			expect(viaAll.data).toEqual({
				billVoteEvents: [{ id: 'bve' }, { id: 'bve-visible-only' }],
			});
			expect(viaUnionAll.data).toEqual({
				bills: [{ id: 'bill-hidden-event' }, { id: 'bill-visible-event' }],
			});
		});

		test('anonymous aggregate filters on relationships are rejected, authenticated ones work', async () => {
			const query = `query {
				billVoteEvents(where: { vote_eventsConnection: { aggregate: { count: { nodes: { eq: 0 } } } } }) { id }
			}`;

			const anonymous = await execute(schema, query);
			const authenticated = await execute(schema, query, {
				jwtPayload: { sub: 'test-user' },
			});

			expect(anonymous.errors).toHaveLength(1);
			expect(anonymous.data).toBeUndefined();
			expect(authenticated.errors).toBeUndefined();
		});

		test('authenticated users can still filter by hidden nodes', async () => {
			const result = await execute(
				schema,
				`query {
					votes(where: { voter: { publish_status: { eq: UNPUBLISHED } } }) { id }
				}`,
				{ jwtPayload: { sub: 'test-user' } },
			);

			expect(result.errors).toBeUndefined();
			expect(result.data).toEqual({ votes: [{ id: 'vote-hidden-voter' }] });
		});
	});

	describe('Membership', () => {
		test('anonymous users see every membership except those of an UNPUBLISHED person', async () => {
			await seedPerson(session, {
				id: 'person-unpublished',
				firstname: 'สมหญิง',
				lastname: 'รักสุข',
				publish_status: 'UNPUBLISHED',
			});
			await seedPerson(session, {
				id: 'person-published',
				firstname: 'สมชาย',
				lastname: 'ใจดี',
				publish_status: 'PUBLISHED',
			});
			await seedOrganization(session, {
				id: 'org-1',
				name: 'Test Organization',
			});
			const members = {
				'membership-hidden': ['person-unpublished'],
				'membership-person': ['person-published'],
				'membership-org': ['org-1'],
				'membership-memberless': [],
			};
			for (const [id, memberIds] of Object.entries(members)) {
				await seedMembership(session, { id, memberIds });
			}

			const result = await execute(
				schema,
				`
				query {
					memberships(sort: { id: ASC }) {
						id
					}
				}
			`,
			);

			expect(result.errors).toBeUndefined();
			const data = result.data as { memberships: { id: string }[] };
			expect(data.memberships.map(({ id }) => id)).toEqual([
				'membership-memberless',
				'membership-org',
				'membership-person',
			]);
		});
	});
});
