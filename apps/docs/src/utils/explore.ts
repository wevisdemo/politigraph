import pluralize from 'pluralize';
import {
	interfaces,
	objects,
	unions,
	type GraphqlDataResponse,
	type GraphqlObject,
} from './schema';

const CONFLICT_ALIAS_SEPARATOR = '___';

export const SEARCH_RESULT_LIMIT_PER_TYPE = 5;

export interface SearchableType {
	name: string;
	searchFields: string[];
}

export const searchableTypes: SearchableType[] = [
	{
		name: 'Person',
		searchFields: ['firstname', 'lastname', 'firstname_en', 'lastname_en'],
	},
	{ name: 'Organization', searchFields: ['name', 'name_en'] },
	{ name: 'VoteEvent', searchFields: ['title', 'nickname'] },
	{ name: 'Bill', searchFields: ['title', 'nickname'] },
];

export const mainNodeTypes = new Set(searchableTypes.map(({ name }) => name));

const LABEL_FIELDS = [
	'name_en',
	'name',
	'label',
	'nickname',
	'title',
	'note',
	'option_en',
	'option',
	'start_date',
	'end_date',
];

const objectMap = new Map(objects.map((obj) => [obj.name, obj]));

const interfaceImplementorsMap = new Map(
	interfaces.map(({ name }) => [
		name,
		objects.filter((obj) => obj.interfaces.includes(name)).map((o) => o.name),
	]),
);

const unionMembersMap = new Map(unions.map(({ name, types }) => [name, types]));

export function buildSearchQuery() {
	const typeQueries = searchableTypes.map(({ name, searchFields }) => {
		const labelFields = getScalarFieldNames(name).filter((field) =>
			LABEL_FIELDS.includes(field),
		);
		const filters = searchFields
			.map((field) => `{ ${field}: { contains: $keyword } }`)
			.join(', ');

		return `${getQueryFieldName(name)}(where: { OR: [${filters}] }, limit: ${SEARCH_RESULT_LIMIT_PER_TYPE}) {
			__typename id ${labelFields.join(' ')}
		}`;
	});

	return `query Search($keyword: String!) {
		${typeQueries.join('\n')}
	}`;
}

function getRelationshipFields(typename: string) {
	return objectMap
		.get(typename)!
		.fields.filter((field) => isNodeType(field.type.name));
}

export function buildCenterNodeQuery(typename: string) {
	return `query CenterNode($id: ID!) {
		${getQueryFieldName(typename)}(where: { id: { eq: $id } }) {
			__typename ${getScalarFieldNames(typename).join(' ')}
			${getRelationshipFields(typename)
				.map(({ name, type }) => `${name} ${getNodeSelection(type.name)}`)
				.join('\n')}
		}
	}`;
}

// The type graph forces branches to stop expanding at cycles, and real data
// may have empty relations, both leaving non-main nodes as dead-end leaves.
// Drop any non-main node without a main-type descendant so every leaf is a
// meaningful main-type node. Mapping before filtering prunes bottom-up, so
// dead-ends cascade away in a single pass.
export function pruneToMainLeaves(node: GraphqlObject): GraphqlObject {
	return Object.fromEntries(
		Object.entries(node).map(([key, value]) =>
			Array.isArray(value)
				? [key, value.map(pruneToMainLeaves).filter(hasMainDescendant)]
				: [key, value],
		),
	) as GraphqlObject;
}

function hasMainDescendant(node: GraphqlObject): boolean {
	return (
		mainNodeTypes.has(node.__typename) ||
		Object.values(node).some(
			(value) => Array.isArray(value) && value.length > 0,
		)
	);
}

export function normalizeAliasedFields(
	data: GraphqlDataResponse,
): GraphqlDataResponse {
	return Object.fromEntries(
		Object.entries(data).map(([key, nodes]) => [
			key,
			nodes.map(renameAliasedKeys),
		]),
	);
}

function renameAliasedKeys(node: GraphqlObject): GraphqlObject {
	return Object.fromEntries(
		Object.entries(node).map(([key, value]) => [
			key.split(CONFLICT_ALIAS_SEPARATOR)[0],
			Array.isArray(value) ? value.map(renameAliasedKeys) : value,
		]),
	) as GraphqlObject;
}

function isNodeType(name: string) {
	return (
		objectMap.has(name) ||
		interfaceImplementorsMap.has(name) ||
		unionMembersMap.has(name)
	);
}

function getQueryFieldName(typename: string) {
	return pluralize(typename.charAt(0).toLowerCase() + typename.slice(1));
}

function getScalarFields(typename: string) {
	return objectMap
		.get(typename)!
		.fields.filter((field) => !isNodeType(field.type.name));
}

function getScalarFieldNames(typename: string) {
	return getScalarFields(typename).map((field) => field.name);
}

function getFieldSignature({ type }: { type: ScalarFieldType }) {
	return `${type.name}:${type.hasMany}:${type.isRequired}`;
}

type ScalarFieldType = ReturnType<typeof getScalarFields>[number]['type'];

// Expand relationships of non-main types until reaching main types. The type
// graph is cyclic (eg. Membership <-> Post, Link <-> bill events), so each
// branch stops expanding a type already found in its ancestor chain.
function getAdjacentSelections(typename: string, expandedAncestors: string[]) {
	return mainNodeTypes.has(typename) || expandedAncestors.includes(typename)
		? []
		: getRelationshipFields(typename).map(
				({ name, type }) =>
					`${name} ${getNodeSelection(type.name, [...expandedAncestors, typename])}`,
			);
}

function getNodeSelection(
	typename: string,
	expandedAncestors: string[] = [],
): string {
	if (objectMap.has(typename)) {
		return `{ __typename ${[
			...getScalarFieldNames(typename),
			...getAdjacentSelections(typename, expandedAncestors),
		].join(' ')} }`;
	}

	const concreteTypes =
		interfaceImplementorsMap.get(typename) ??
		unionMembersMap.get(typename) ??
		[];

	const fieldSignatures = new Map<string, string[]>();

	concreteTypes.flatMap(getScalarFields).forEach((field) => {
		const signatures = fieldSignatures.get(field.name) ?? [];
		const signature = getFieldSignature(field);

		if (!signatures.includes(signature)) {
			fieldSignatures.set(field.name, [...signatures, signature]);
		}
	});

	// GraphQL forbids fields with the same name but different types across
	// sibling fragments, so conflicting fields are aliased and renamed back
	// by normalizeAliasedFields after fetching
	const fragments = concreteTypes.map((type) => {
		const selections = getScalarFields(type).map((field) => {
			const signatureIndex = fieldSignatures
				.get(field.name)!
				.indexOf(getFieldSignature(field));

			return signatureIndex
				? `${field.name}${CONFLICT_ALIAS_SEPARATOR}${signatureIndex}: ${field.name}`
				: field.name;
		});

		return `... on ${type} { ${[
			...selections,
			...getAdjacentSelections(type, expandedAncestors),
		].join(' ')} }`;
	});

	return `{ __typename ${fragments.join(' ')} }`;
}
