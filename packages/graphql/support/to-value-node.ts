import {
	isEnumType,
	isInputObjectType,
	isListType,
	isNonNullType,
	Kind,
	type GraphQLInputType,
	type ValueNode,
} from 'graphql';

/**
 * @param type used to print enum values as enums, otherwise they are printed as strings
 */
export function toValueNode(
	value: unknown,
	type?: GraphQLInputType,
): ValueNode {
	const nullable = type && isNonNullType(type) ? type.ofType : type;

	if (value === null || value === undefined) return { kind: Kind.NULL };

	if (Array.isArray(value) || (nullable && isListType(nullable)))
		return {
			kind: Kind.LIST,
			values: [value]
				.flat()
				.map((item) =>
					toValueNode(
						item,
						nullable && isListType(nullable) ? nullable.ofType : undefined,
					),
				),
		};

	if (typeof value === 'object') {
		const fields =
			nullable && isInputObjectType(nullable) ? nullable.getFields() : {};

		return {
			kind: Kind.OBJECT,
			fields: Object.entries(value)
				.filter(([, item]) => item !== undefined)
				.map(([name, item]) => ({
					kind: Kind.OBJECT_FIELD,
					name: { kind: Kind.NAME, value: name },
					value: toValueNode(item, fields[name]?.type),
				})),
		};
	}

	if (nullable && isEnumType(nullable))
		return { kind: Kind.ENUM, value: String(value) };

	if (typeof value === 'boolean') return { kind: Kind.BOOLEAN, value };

	if (typeof value === 'number')
		return {
			kind: Number.isInteger(value) ? Kind.INT : Kind.FLOAT,
			value: String(value),
		};

	return { kind: Kind.STRING, value: String(value) };
}
