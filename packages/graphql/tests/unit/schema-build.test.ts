import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { Kind, parse } from 'graphql';
import { getGraphqlTypeDefs } from '../../domains/type-defs';
import { TIMESTAMP_FIELD_NOTE } from '../../support/summary';

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

	test('notes every @timestamp field as an internal system field', async () => {
		const { definitions } = parse(await getGraphqlTypeDefs(DOMAINS_DIR));

		const timestampFields = definitions
			.flatMap((definition) =>
				definition.kind === Kind.OBJECT_TYPE_DEFINITION ||
				definition.kind === Kind.INTERFACE_TYPE_DEFINITION
					? (definition.fields ?? [])
					: [],
			)
			.filter((field) =>
				field.directives?.some(({ name }) => name.value === 'timestamp'),
			);

		expect(timestampFields.length).toBeGreaterThan(0);

		for (const field of timestampFields) {
			expect(field.description?.value).toEndWith(`(${TIMESTAMP_FIELD_NOTE})`);
			expect(field.description?.value).toMatch(/^[฀-๿]/);
		}
	});

	test('returns a non-empty string', async () => {
		const result = await getGraphqlTypeDefs(DOMAINS_DIR);
		expect(result.length).toBeGreaterThan(0);
	});
});
