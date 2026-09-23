# Politigraph

## General Instructions

- Always use bun as a package manager and JavaScript runtime
- The GitHub owner and repo is wevisdemo/politigraph
- Do not use CSS style block if not necessary, using Tailwind classes is preferable
- Always name source code in kebab-case
- Avoid mutating variables, prefer functional approach when possible
- Don't write arbitrary comment if the code is self-explainable
- Add/update test cases if your changes effect business logic, only add high value test case and grouped it if possible to reduce redundancy and test time
- If your changes affect the GraphQL schema, query limits, API endpoints or MCP tools, add a dated entry to `apps/docs/src/content/docs/en/changelog.mdx`. CI enforces this only for schema `.graphql` files, `custom-resolvers.ts` and `deprecated-fields.ts` in `packages/graphql`
- After finishing any task, run the following commands:
  - Check type with `bun run check`
  - Lint with `bun run lint`, all errors and warnings must be fixed
  - Format code with `bun run format` before declaring task as done
  - Run involved tests as appropriate. For integration and e2e test, must use `compose.test.yml` to set up test databases. Don't use `compose.yml` which is for development.
- Human will get in the loop and edit some file along the way. If you spot it, please respect those changes

## Folder Structure

This project is a monorepo managed by Turborepo.

- /apps/admin : Application repository
- /apps/api : Backend API for GraphQL, authentication, and static file (web/assets) serving
- /apps/docs : Landing page and documentations to be built as static website
- /packages/auth : Authentication and related database management
- /packages/graphql : Schemas and custom resolvers implementation

More information on tech stack of each project can be found in the respective README.md files

## Git Commit Message Style

- Use conventional commit format
- Don't add body to the commit message. Concisely explain changes to the message title
- If the changes specific to any app or package, then add it name to the scope

## Testing

Test commands:

- `bun run test:unit` — unit tests
- `bun run test:integration` — integration tests (starts and stops the test databases itself)
- `bun run test:e2e` — Playwright E2E tests (starts and stops the test databases itself)
  - On NixOS, must run inside the flake dev shell with `nix develop --command bun run test:e2e`, unless direnv already loaded it
  - `SEED_ADMIN_PASSWORD` must be set. The task migrates and seeds the `admin@wevis.info` user by itself, and the login fixture signs in with that password
  - Playwright starts its own API on port 3100 and admin on port 8100, so it can run alongside the dev servers and `compose.yml`

Both `test:integration` and `test:e2e` wrap their turbo task in `test:db:up` / `test:db:down`, which recreate the test containers before the run and remove them after, so every run starts from an empty database. `compose.test.yml` declares no volumes, so nothing survives the teardown. Use those two scripts directly to keep the databases up while debugging.

Test databases (`compose.test.yml`):

- Neo4j: port 7688
- Postgres: port 5433
