import {
	buildSchema,
	getNamedType,
	getNullableType,
	isAbstractType,
	isEnumType,
	isInputObjectType,
	isLeafType,
	isListType,
	type GraphQLField,
	type GraphQLInputObjectType,
	type GraphQLNamedType,
} from 'graphql';

export interface BuilderField {
	name: string;
	description?: string;
	type: string;
	isList: boolean;
	isNode: boolean;
	where?: string;
	sort?: string;
	hasLimit: boolean;
}

export interface BuilderFilterOperator {
	name: string;
	type: string;
	isList: boolean;
}

export interface BuilderFilter {
	field: string;
	ops: BuilderFilterOperator[];
}

export interface BuilderType {
	name: string;
	description?: string;
	fields: BuilderField[];
	possibleTypes: string[];
}

export interface BuilderSchema {
	roots: BuilderField[];
	types: Record<string, BuilderType>;
	filters: Record<string, BuilderFilter[]>;
	sorts: Record<string, string[]>;
	enums: Record<string, string[]>;
}

const getArgType = (
	field: GraphQLField<unknown, unknown>,
	name: string,
): GraphQLInputObjectType | undefined => {
	const type = field.args.find((arg) => arg.name === name)?.type;
	const namedType = type && getNamedType(type);
	return namedType && isInputObjectType(namedType) ? namedType : undefined;
};

const isLeafFilter = (input: GraphQLInputObjectType) =>
	Object.values(input.getFields()).every((field) =>
		isLeafType(getNamedType(field.type)),
	);

/**
 * Condense the generated API schema into what the query builder needs: the
 * node types reachable from the root query, plus the scalar filters and sort
 * fields their `where` and `sort` arguments accept.
 */
export function toBuilderSchema(sdl: string): BuilderSchema {
	const schema = buildSchema(sdl);
	const builder: BuilderSchema = {
		roots: [],
		types: {},
		filters: {},
		sorts: {},
		enums: {},
	};

	function toBuilderField(field: GraphQLField<unknown, unknown>): BuilderField {
		const type = getNamedType(field.type);
		const where = getArgType(field, 'where');
		const sort = getArgType(field, 'sort');
		const isNode = !isLeafType(type);

		if (isNode) addType(type);
		if (where) addFilters(where);
		if (sort) {
			builder.sorts[sort.name] ??= Object.keys(sort.getFields());
		}

		return {
			name: field.name,
			description: field.description ?? undefined,
			type: type.name,
			isList: isListType(getNullableType(field.type)),
			isNode,
			where: where?.name,
			sort: sort?.name,
			hasLimit: field.args.some((arg) => arg.name === 'limit'),
		};
	}

	function addType(type: GraphQLNamedType) {
		if (builder.types[type.name]) return;

		const fields = 'getFields' in type ? Object.values(type.getFields()) : [];
		const possibleTypes = isAbstractType(type)
			? schema.getPossibleTypes(type)
			: [];

		builder.types[type.name] = {
			name: type.name,
			description: type.description ?? undefined,
			fields: [],
			possibleTypes: possibleTypes.map(({ name }) => name),
		};
		builder.types[type.name].fields = fields
			.filter((field) => !field.name.endsWith('Connection'))
			.map(toBuilderField);
		possibleTypes.forEach(addType);
	}

	function addFilters(where: GraphQLInputObjectType) {
		if (builder.filters[where.name]) return;

		builder.filters[where.name] = Object.values(where.getFields()).flatMap(
			(field) => {
				const filter = getNamedType(field.type);

				if (!isInputObjectType(filter) || !isLeafFilter(filter)) return [];

				return [
					{
						field: field.name,
						ops: Object.values(filter.getFields()).map((op) => {
							const type = getNamedType(op.type);

							if (isEnumType(type)) {
								builder.enums[type.name] ??= type
									.getValues()
									.map(({ name }) => name);
							}

							return {
								name: op.name,
								type: type.name,
								isList: isListType(getNullableType(op.type)),
							};
						}),
					},
				];
			},
		);
	}

	builder.roots = Object.values(schema.getQueryType()?.getFields() ?? {})
		.filter((field) => field.args.some((arg) => arg.name === 'limit'))
		.map(toBuilderField);

	return builder;
}
