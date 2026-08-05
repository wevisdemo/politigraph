import { randomBytes } from 'node:crypto';
import { databaseUrl } from '@politigraph/config/postgres';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './auth-schema';

const SEED_EMAIL = 'admin@wevis.info';

async function seed() {
	if (
		process.env.NODE_ENV === 'production' &&
		process.env.FORCE_SEED !== 'true'
	) {
		throw new Error(
			'Refusing to seed in production. Set FORCE_SEED=true to override.',
		);
	}

	const db = drizzle(databaseUrl);

	try {
		const [existing] = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.email, SEED_EMAIL))
			.limit(1);

		if (existing) {
			console.log(
				'Seed user already exists, skipping. Its password is left unchanged.',
			);
			return;
		}

		const providedPassword = process.env.SEED_ADMIN_PASSWORD || undefined;
		const password = providedPassword ?? randomBytes(18).toString('base64url');
		const hashedPassword = await hashPassword(password);
		const userId = crypto.randomUUID();

		await db.transaction(async (tx) => {
			await tx.insert(schema.users).values({
				id: userId,
				name: 'Admin',
				email: SEED_EMAIL,
				emailVerified: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: 'admin',
			});

			await tx.insert(schema.accounts).values({
				id: crypto.randomUUID(),
				accountId: userId,
				providerId: 'credential',
				userId,
				password: hashedPassword,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		});

		console.log(`Seed user created: ${SEED_EMAIL}`);
		if (!providedPassword) {
			console.log(`Generated password (shown once): ${password}`);
		}
	} finally {
		await db.$client.close();
	}
}

seed().catch((error) => {
	console.error(error);
	process.exit(1);
});
