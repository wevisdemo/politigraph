import {
	changedSets,
	diffLinks,
	hasChanges,
	linksUpdate,
	relationUpdate,
} from '~/utils/update-input';
import { describe, expect, test } from 'vitest';

describe('changedSets', () => {
	const keys = ['name', 'note', 'tags', 'count'] as const;
	const original = { name: 'a', note: null, tags: ['x', 'y'], count: 0 };

	test('sends only differing keys, comparing arrays by value and null with undefined as equal', () => {
		expect(
			changedSets(
				original,
				{ name: 'b', note: undefined, tags: ['x', 'y'], count: 0 },
				keys,
			),
		).toEqual({ name: { set: 'b' } });
		expect(
			changedSets(
				original,
				{ name: 'a', note: 'n', tags: ['x'], count: 1 },
				keys,
			),
		).toEqual({
			note: { set: 'n' },
			tags: { set: ['x'] },
			count: { set: 1 },
		});
	});

	test('reports no change for identical values', () => {
		const update = changedSets(original, { ...original }, keys);
		expect(update).toEqual({});
		expect(hasChanges(update)).toBe(false);
	});

	test('clearing a value is a change', () => {
		expect(
			changedSets({ name: 'a' }, { name: null }, ['name'] as const),
		).toEqual({ name: { set: null } });
	});
});

describe('relation helpers', () => {
	test('omit empty connect, disconnect and the whole relation', () => {
		expect(relationUpdate([], [])).toBeUndefined();
		expect(relationUpdate(['a'], [])).toEqual([
			{
				connect: [{ where: { node: { id: { in: ['a'] } } } }],
				disconnect: undefined,
			},
		]);
	});
});

describe('diffLinks', () => {
	const original = [
		{ id: '1', note: 'n1', url: 'u1' },
		{ id: '2', note: 'n2', url: 'u2' },
		{ id: '3', note: 'n3', url: 'u3' },
	];

	test('splits created, deleted and changed links, ignoring untouched ones', () => {
		const links = diffLinks(original, [
			{ id: '1', note: 'n1', url: 'u1' },
			{ id: '2', note: 'n2', url: 'changed' },
			{ note: 'new', url: 'nu' },
		]);

		expect(links.create).toEqual([{ node: { note: 'new', url: 'nu' } }]);
		expect(links.deleteIds).toEqual(['3']);
		expect(links.updates).toEqual([
			{ id: '2', update: { url: { set: 'changed' } } },
		]);
		expect(linksUpdate(links)).toEqual([
			{
				create: links.create,
				delete: [{ where: { node: { id: { in: ['3'] } } } }],
			},
		]);
	});

	test('yields no link update when nothing changed', () => {
		const links = diffLinks(original, original);
		expect(links.updates).toEqual([]);
		expect(linksUpdate(links)).toBeUndefined();
	});
});
