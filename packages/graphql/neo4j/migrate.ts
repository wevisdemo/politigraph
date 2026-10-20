import { type Session } from 'neo4j-driver';
import { driver } from './driver';
import { migrations } from './migrations';

function checksum(cypher: string) {
	return new Bun.CryptoHasher('sha256').update(cypher).digest('hex');
}

export function toStatements(cypher: string) {
	return cypher
		.split('\n')
		.filter((line) => !line.trim().startsWith('//'))
		.join('\n')
		.split(/;\s*$/m)
		.map((statement) => statement.trim())
		.filter(Boolean);
}

async function getAppliedChecksums(session: Session) {
	const { records } = await session.run(
		'MATCH (migration:__Migration) RETURN migration.id AS id, migration.checksum AS checksum',
	);

	return new Map<string, string>(
		records.map((record) => [record.get('id'), record.get('checksum')]),
	);
}

export async function getPendingMigrations() {
	const session = driver.session();

	try {
		const applied = await getAppliedChecksums(session);
		return migrations.filter(({ id }) => !applied.has(id));
	} finally {
		await session.close();
	}
}

export async function assertNoPendingMigrations() {
	const pending = await getPendingMigrations();

	if (pending.length > 0) {
		throw new Error(
			`[Neo4j] ${pending.length} pending migration(s): ${pending.map(({ id }) => id).join(', ')}. Run \`bun run migrate\` in packages/graphql`,
		);
	}
}

export async function runMigrations() {
	const session = driver.session();

	try {
		await session.run(
			'CREATE CONSTRAINT constraint_migration_id IF NOT EXISTS FOR (migration:__Migration) REQUIRE migration.id IS UNIQUE',
		);

		const applied = await getAppliedChecksums(session);
		const known = new Set(migrations.map(({ id }) => id));

		for (const id of applied.keys()) {
			if (!known.has(id)) {
				console.warn(`[Neo4j] Applied migration ${id} is unknown to this code`);
			}
		}

		let count = 0;

		for (const { id, cypher } of migrations) {
			const appliedChecksum = applied.get(id);

			if (appliedChecksum !== undefined) {
				if (appliedChecksum !== checksum(cypher)) {
					throw new Error(
						`[Neo4j] Migration ${id} was modified after being applied. Add a new migration instead`,
					);
				}
				continue;
			}

			for (const statement of toStatements(cypher)) {
				await session.run(statement);
			}

			await session.run(
				'CREATE (:__Migration {id: $id, checksum: $checksum, applied_at: datetime()})',
				{ id, checksum: checksum(cypher) },
			);
			console.info(`[Neo4j] Applied migration ${id}`);
			count++;
		}

		console.info(`[Neo4j] ${count} migration(s) applied`);
	} finally {
		await session.close();
	}
}

if (import.meta.main) {
	try {
		await runMigrations();
	} finally {
		await driver.close();
	}
}
