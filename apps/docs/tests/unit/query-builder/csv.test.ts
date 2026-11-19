import { describe, expect, test } from 'bun:test';
import { toCsvFiles } from '../../../src/utils/query-builder/csv';
import type { GraphqlObject } from '../../../src/utils/schema';

const people: GraphqlObject[] = [
	{
		__typename: 'Person',
		id: 'p1',
		name: 'Somchai, "Big"',
		memberships: [
			{
				__typename: 'Membership',
				id: 'm1',
				label: 'Member',
				organizations: [{ __typename: 'Organization', id: 'o1', name: 'A' }],
			},
		],
	},
	{ __typename: 'Person', id: 'p2', name: 'Somsri', memberships: [] },
];

describe('toCsvFiles', () => {
	test('splits nested nodes into one csv per type linked by parent id', () => {
		expect(toCsvFiles(people)).toEqual({
			'Person.csv': '﻿id,name\r\np1,"Somchai, ""Big"""\r\np2,Somsri',
			'Membership.csv': '﻿Person_id,id,label\r\np1,m1,Member',
			'Organization.csv': '﻿Membership_id,id,name\r\nm1,o1,A',
		});
	});

	test('produces a single file when nothing is nested', () => {
		expect(Object.keys(toCsvFiles([people[1]]))).toEqual(['Person.csv']);
	});
});
