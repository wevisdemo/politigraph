import { makeExecutableSchema } from '@graphql-tools/schema';
import { auditLogs } from '@politigraph/auth/audit-schema';
import { db } from '@politigraph/auth/db';
import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { Elysia } from 'elysia';
import { auditLogPlugin } from '../../src/plugins/audit-log';
import { apollo } from '../../src/routes/graphql';

const schema = makeExecutableSchema({
	typeDefs: `
		type Query { hello: String }
		input IdWhere { eq: ID }
		input PersonWhere { id: IdWhere }
		input PersonUpdate { name: String }
		type Person { id: ID! }
		type UpdatePeople { people: [Person!]! }
		type Mutation {
			updatePeople(where: PersonWhere, update: PersonUpdate): UpdatePeople
			failPeople(where: PersonWhere): UpdatePeople
		}
	`,
	resolvers: {
		Query: { hello: () => 'world' },
		Mutation: {
			updatePeople: (_, { where }) => ({ people: [{ id: where.id.eq }] }),
			failPeople: () => {
				throw new Error('Forbidden');
			},
		},
	},
});

const app = new Elysia().use(
	await apollo({
		schema,
		plugins: [auditLogPlugin],
		allowBatchedHttpRequests: true,
		context: async ({ request }) => {
			const token = request.headers.get('x-test-token');
			return token ? { token } : {};
		},
	}),
);

const tokenOf = (payload: object) =>
	`e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;

const post = (body: unknown, headers: Record<string, string> = {}) =>
	app
		.handle(
			new Request('http://localhost/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...headers },
				body: JSON.stringify(body),
			}),
		)
		.then((res) => res.json());

const UPDATE = {
	operationName: 'Rename',
	query: `mutation Rename($v1: PersonWhere, $v2: PersonUpdate) {
		renamed: updatePeople(where: $v1, update: $v2) { people { id } }
	}`,
	variables: { v1: { id: { eq: 'p1' } }, v2: { name: 'New' } },
};

const rows = () => db.select().from(auditLogs).orderBy(auditLogs.id);

const jsonTypes = async () => [
	...(await db.$client`select jsonb_typeof(changes) as changes, jsonb_typeof(errors) as errors from audit_logs order by id`),
];

describe('audit log plugin', () => {
	beforeEach(async () => {
		await db.delete(auditLogs);
	});

	test('a mutation with a session token writes a row', async () => {
		const body = await post(UPDATE, {
			'x-test-token': tokenOf({ sub: 'u1', sid: 's1' }),
		});

		expect(body.data.renamed.people).toEqual([{ id: 'p1' }]);
		expect(await rows()).toEqual([
			expect.objectContaining({
				userId: 'u1',
				via: 'session',
				credentialId: 's1',
				operationName: 'Rename',
				changes: [
					{
						field: 'updatePeople',
						args: { where: { id: { eq: 'p1' } }, update: { name: 'New' } },
					},
				],
				nodeIds: ['p1'],
				errors: null,
			}),
		]);
		expect(await jsonTypes()).toEqual([{ changes: 'array', errors: null }]);
	});

	test('a failing mutation in a batch writes its errors, and the query in it writes nothing', async () => {
		await post(
			[
				{
					query:
						'mutation { failPeople(where: { id: { eq: "p2" } }) { people { id } } }',
				},
				{ query: '{ hello }' },
			],
			{ 'x-test-token': tokenOf({ sub: 'u2', sid: 'k2' }), 'x-api-key': 'key' },
		);

		expect(await rows()).toEqual([
			expect.objectContaining({
				userId: 'u2',
				via: 'api_key',
				credentialId: 'k2',
				operationName: null,
				changes: [
					{ field: 'failPeople', args: { where: { id: { eq: 'p2' } } } },
				],
				nodeIds: ['p2'],
				errors: [{ message: 'Forbidden', path: ['failPeople'] }],
			}),
		]);
		expect(await jsonTypes()).toEqual([{ changes: 'array', errors: 'array' }]);
	});

	test('an anonymous mutation writes nothing', async () => {
		await post(UPDATE);

		expect(await rows()).toEqual([]);
	});

	test('a failed insert still returns the mutation result', async () => {
		const consoleError = spyOn(console, 'error').mockImplementation(() => {});

		// No `sub`, so the insert violates the not-null `user_id`
		const body = await post(UPDATE, { 'x-test-token': tokenOf({}) });

		expect(body).toEqual({ data: { renamed: { people: [{ id: 'p1' }] } } });
		expect(consoleError).toHaveBeenCalledWith(
			'Failed to write audit log',
			expect.anything(),
		);
		expect(await rows()).toEqual([]);

		consoleError.mockRestore();
	});
});
