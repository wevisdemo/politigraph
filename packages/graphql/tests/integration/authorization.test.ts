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

		test('vote linked to both published and unpublished events is visible', async () => {
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
				id: 'vote-mixed',
				option: 'เห็นด้วย',
				voteEventId: 've-published',
			});
			await session.run(
				`MATCH (v:Vote {id: 'vote-mixed'}), (ve:VoteEvent {id: 've-unpublished'})
				CREATE (v)-[:VOTED_IN]->(ve)`,
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
			expect(data.votes[0]!.id).toBe('vote-mixed');
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
				personId: 'person-unpublished',
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

	describe('Membership', () => {
		test('memberships whose members are all UNPUBLISHED are hidden from anonymous users', async () => {
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
			await seedMembership(session, {
				id: 'membership-hidden',
				personId: 'person-unpublished',
			});
			await seedMembership(session, {
				id: 'membership-visible',
				personId: 'person-published',
			});

			const result = await execute(
				schema,
				`
				query {
					memberships {
						id
					}
				}
			`,
			);

			expect(result.errors).toBeUndefined();
			const data = result.data as { memberships: { id: string }[] };
			expect(data.memberships).toHaveLength(1);
			expect(data.memberships[0]!.id).toBe('membership-visible');
		});
	});
});
