import pluralize from 'pluralize';
import {
	interfaces,
	objects,
	unions,
	type GraphqlDataResponse,
	type GraphqlObject,
} from './schema';

const CONFLICT_ALIAS_SEPARATOR = '___';
const CONNECTION_FIELD_SUFFIX = 'Connection';

export const RELATIONSHIP_NODES_LIMIT = 100;

const EXPANDED_NODE_TYPES = ['Membership', 'Post', 'Vote'];

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

export function buildSearchQuery({ name, searchFields }: SearchableType) {
	const labelFields = getScalarFieldNames(name).filter((field) =>
		LABEL_FIELDS.includes(field),
	);
	const filters = searchFields
		.map((field) => `{ ${field}: { contains: $keyword } }`)
		.join(', ');

	return `query Search($keyword: String!) {
		${getQueryFieldName(name)}(where: { OR: [${filters}] }, limit: 10) {
			__typename id ${labelFields.join(' ')}
		}
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
				.map(
					({ name, type }) =>
						`${name}(limit: ${RELATIONSHIP_NODES_LIMIT}) ${getNodeSelection(type.name)}
						${name}${CONNECTION_FIELD_SUFFIX} { totalCount }`,
				)
				.join('\n')}
		}
	}`;
}

export function parseCenterNode(raw: GraphqlObject) {
	const entries = Object.entries(raw);

	return {
		node: Object.fromEntries(
			entries.filter(([key]) => !key.endsWith(CONNECTION_FIELD_SUFFIX)),
		) as GraphqlObject,
		relationshipCounts: Object.fromEntries(
			entries
				.filter(([key]) => key.endsWith(CONNECTION_FIELD_SUFFIX))
				.map(([key, value]) => [
					key.slice(0, -CONNECTION_FIELD_SUFFIX.length),
					(value as unknown as { totalCount: number }).totalCount,
				]),
		),
	};
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

function getNodeSelection(
	typename: string,
	expandedAncestors: string[] = [],
): string {
	if (objectMap.has(typename)) {
		const adjacentSelections =
			EXPANDED_NODE_TYPES.includes(typename) &&
			!expandedAncestors.includes(typename)
				? getRelationshipFields(typename).map(
						({ name, type }) =>
							`${name}(limit: ${RELATIONSHIP_NODES_LIMIT}) ${getNodeSelection(type.name, [...expandedAncestors, typename])}`,
					)
				: [];

		return `{ __typename ${[...getScalarFieldNames(typename), ...adjacentSelections].join(' ')} }`;
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

		return `... on ${type} { ${selections.join(' ')} }`;
	});

	return `{ __typename ${fragments.join(' ')} }`;
}
