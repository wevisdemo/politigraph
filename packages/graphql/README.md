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

## Neo4j migrations

Indexes, constraints and data changes live in `migrations/` as numbered Cypher files (`0002-short-name.cypher`). Applied migrations are recorded as `(:__Migration)` nodes, so each one runs once per database.

To add a migration:

1. Create the next numbered `.cypher` file (`NNNN-short-name.cypher`, no gaps). It is discovered automatically: a Bun macro reads the folder at bundle time, so the files are embedded in the compiled API. A unit test checks the numbering.
2. Never edit an applied file, the runner rejects a changed checksum. Add a new migration instead.
3. Make every statement safe to re-run (`IF NOT EXISTS`, guarded `SET`). Neo4j cannot mix schema and data changes in one transaction, so statements run one by one and a failed file is retried from its first statement.
4. Keep it compatible with the previous release. In production migrations run before the new API is deployed, while the old one is still serving.

Migrations are forward-only. They run through `bun run migrate`, which turbo triggers for `dev`, `test:integration` and `test:e2e`, and in CI before deploy. The API refuses to start while migrations are pending.

## Scripts

- `dev` build in watch mode
- `build` build genql client, GraphQL schema, and definitions JSON file
- `migrate` apply pending Neo4j migrations
