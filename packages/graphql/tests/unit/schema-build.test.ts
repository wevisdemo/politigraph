import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import {
	getGraphqlCreateIndexQueries,
	getGraphqlTypeDefs,
} from '../../schema/index';

const SCHEMA_DIR = join(import.meta.dir, '../../schema');

describe('getGraphqlTypeDefs', () => {
	test('concatenates all .graphql files under schema/', async () => {
		const result = await getGraphqlTypeDefs(SCHEMA_DIR);

		// Should contain content from multiple schema files
		expect(result).toContain('type Person');
		expect(result).toContain('type Organization');
		expect(result).toContain('type Vote');
		expect(result).toContain('type Post');
		expect(result).toContain('type AlternatePersonName');

		// Should contain enum definitions
		expect(result).toContain('enum OrganizationType');
		expect(result).toContain('enum Gender');
	});

	test('returns a non-empty string', async () => {
		const result = await getGraphqlTypeDefs(SCHEMA_DIR);
		expect(result.length).toBeGreaterThan(0);
	});
});

describe('getGraphqlCreateIndexQueries', () => {
	test('splits indexes.cypher and trims empty entries', async () => {
		const result = await getGraphqlCreateIndexQueries(SCHEMA_DIR);

		expect(result.length).toBeGreaterThan(0);
		expect(result.every((query) => query.length > 0)).toBe(true);
		expect(result.some((query) => query.includes('CREATE INDEX'))).toBe(true);
	});
});
