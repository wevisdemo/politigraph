import { databaseUrl } from '@politigraph/config/postgres';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './auth-schema';

async function seed() {
	const db = drizzle(databaseUrl);

	const [existing] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, 'admin@wevis.info'))
		.limit(1);

	if (existing) {
		console.log('Seed user already exists, skipping.');
		return;
	}

	const hashedPassword = await hashPassword('testpassword123');
	const userId = crypto.randomUUID();

	await db.insert(schema.users).values({
		id: userId,
		name: 'Admin',
		email: 'admin@wevis.info',
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		role: 'admin',
	});

	await db.insert(schema.accounts).values({
		id: crypto.randomUUID(),
		accountId: userId,
		providerId: 'credential',
		userId,
		password: hashedPassword,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	console.log('Seed user created: admin@wevis.info / testpassword123');
}

seed().catch((error) => {
	console.error(error);
	process.exit(1);
});
