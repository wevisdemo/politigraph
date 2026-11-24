import type { Link, LinkUpdateInput } from '@politigraph/graphql/genql';
import { isEqual } from 'radash';

type LinkFields = Partial<Pick<Link, 'id'>> & Pick<Link, 'note' | 'url'>;

/** Fields `U` accepts in an update. A union of inputs yields only the fields they share. */
export type UpdateFields<U> = readonly (keyof U)[];

/**
 * Builds `{ field: { set: value } }` for the keys whose current value differs from the original.
 * `null` and `undefined` count as equal.
 */
export function changedSets<T extends object, K extends keyof T>(
	original: Partial<Record<K, unknown>> | null | undefined,
	current: T,
	keys: readonly K[],
) {
	return Object.fromEntries(
		keys
			.filter((key) => !isEqual(original?.[key] ?? null, current[key] ?? null))
			.map((key) => [key, { set: current[key] }]),
	) as { [P in K]?: { set: T[P] } };
}

export const hasChanges = (update: object) =>
	Object.values(update).some((value) => value !== undefined);

export const nodeIdsWhere = (ids: string[]) =>
	ids.length ? [{ where: { node: { id: { in: ids } } } }] : undefined;

export const relationUpdate = (connect: string[], disconnect: string[]) =>
	connect.length || disconnect.length
		? [{ connect: nodeIdsWhere(connect), disconnect: nodeIdsWhere(disconnect) }]
		: undefined;

export function diffLinks(original: LinkFields[], current: LinkFields[]) {
	const create = current
		.filter((link) => !original.some(({ id }) => id === link.id))
		.map(({ note, url }) => ({ node: { note, url } }));
	const deleteIds = original
		.filter(({ id }) => !current.some((link) => link.id === id))
		.map(({ id }) => id as string);
	const updates = current.flatMap((link) => {
		const orig = link.id && original.find(({ id }) => id === link.id);
		if (!orig) return [];
		const update = changedSets(orig, link, [
			'note',
			'url',
		] satisfies UpdateFields<LinkUpdateInput>);
		return hasChanges(update) ? [{ id: orig.id as string, update }] : [];
	});

	return { create, deleteIds, updates };
}

export const linksUpdate = (links: ReturnType<typeof diffLinks>) =>
	links.create.length || links.deleteIds.length
		? [
				{
					create: links.create.length ? links.create : undefined,
					delete: nodeIdsWhere(links.deleteIds),
				},
			]
		: undefined;
