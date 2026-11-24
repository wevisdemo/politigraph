import { auth } from '@politigraph/auth/auth';
import { users } from '@politigraph/auth/auth-schema';
import { db } from '@politigraph/auth/db';
import { afterAll, describe, expect, test } from 'bun:test';
import { getJwtToken } from '../../src/utils/auth';

const userId = crypto.randomUUID();

describe('getJwtToken', () => {
	afterAll(async () => {
		await db.$client`delete from users where id = ${userId}`;
	});

	test("an API key's JWT names the key by id, without key material", async () => {
		await db.insert(users).values({
			id: userId,
			name: 'Key owner',
			email: `${userId}@example.com`,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const { id, key } = await auth.api.createApiKey({ body: { userId } });

		const result = await getJwtToken(
			new Headers({ 'x-api-key': key }),
			'http://localhost:3000',
		);
		const payload = Buffer.from(
			result?.token.split('.')[1] ?? '',
			'base64url',
		).toString();

		expect(JSON.parse(payload)).toMatchObject({ sub: userId, sid: id });
		expect(payload).not.toContain(key);
	});
});
