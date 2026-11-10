import { beforeAll, expect, test } from 'bun:test';
import { buildSchema, cleanDatabase, execute } from './helpers';

const AUTHENTICATED = { jwtPayload: { sub: 'test-user' } };

let schema: Awaited<ReturnType<typeof buildSchema>>;

beforeAll(async () => {
	schema = await buildSchema({ withAuth: true });
	await cleanDatabase();
});

test('Post.label reads the single organization of a post created through Organization.posts', async () => {
	const created = await execute(
		schema,
		`mutation {
			createOrganizations(input: [{
				id: "พรรคก้าวไกล",
				name: "พรรคก้าวไกล",
				classification: POLITICAL_PARTY,
				posts: { create: [{ node: { role: "หัวหน้าพรรคการเมือง" } }] }
			}]) { organizations { id } }
		}`,
		AUTHENTICATED,
	);
	expect(created.errors).toBeUndefined();

	const { data, errors } = await execute(
		schema,
		'{ posts { label organization { name } } }',
	);
	expect(errors).toBeUndefined();
	expect(data?.posts).toEqual([
		{
			label: 'หัวหน้าพรรคพรรคก้าวไกล',
			organization: { name: 'พรรคก้าวไกล' },
		},
	]);
});
