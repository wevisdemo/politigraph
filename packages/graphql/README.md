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

## Scripts

- `dev` build in watch mode
- `build` build genql client, GraphQL schema, and definitions JSON file
