# @politigraph/graphql

Schemas and custom resolvers implementation

## Tech Stack

- Neo4j GraphQL library
- GenQL

## Deprecating a client-visible field

When renaming or removing a field that clients can query, keep the old field with the standard GraphQL `@deprecated` directive and a reason naming the replacement:

```graphql
voter_name: String @deprecated(reason: "Use `voter_name_raw` instead.")
```

The directive stays in the generated schema, so it shows up in the playground, in `/schema.graphql`, and in GenQL clients. Remove the field in a later commit and record both the deprecation and the removal in `apps/docs/src/content/docs/en/changelog.mdx`.

A `@relationship` field cannot be renamed this way. Keeping the old name alongside the new one means two fields sharing a relationship type and direction, which the Neo4j GraphQL library rejects at build time, and `@deprecated` does not exempt them. Such a rename is a breaking change in a single commit — record it under `### Breaking` with the replacement field named.

## Scripts

- `dev` build in watch mode
- `build` build genql client, GraphQL schema, and definitions JSON file
