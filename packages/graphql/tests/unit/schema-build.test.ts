import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { getGraphqlTypeDefs } from '../../domains/type-defs';

const DOMAINS_DIR = join(import.meta.dir, '../../domains');

describe('getGraphqlTypeDefs', () => {
	test('concatenates all .graphql files under domains/', async () => {
		const result = await getGraphqlTypeDefs(DOMAINS_DIR);

		// Should contain content from every domain folder
		expect(result).toContain('type Person');
		expect(result).toContain('type Organization');
		expect(result).toContain('type Bill ');
		expect(result).toContain('type Vote');
		expect(result).toContain('type Post');
		expect(result).toContain('type AlternatePersonName');
		expect(result).toContain('type Timestamps');
		expect(result).toContain('type Link');

		// Should contain enum definitions
		expect(result).toContain('enum OrganizationType');
		expect(result).toContain('enum Gender');
	});

	test('returns a non-empty string', async () => {
		const result = await getGraphqlTypeDefs(DOMAINS_DIR);
		expect(result.length).toBeGreaterThan(0);
	});
});
