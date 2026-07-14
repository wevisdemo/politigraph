# Politigraph

## General Instructions

- Always use bun as a package manager and JavaScript runtime
- The GitHub owner and repo is wevisdemo/politigraph
- Do not use CSS style block if not necessary, using Tailwind classes is preferable
- Always name source code in kebab-case
- Avoid mutating variables, prefer functional approach when possible
- Don't write arbitrary comment if the code is self-explainable
- Add/update test cases if your changes effect business logic
- After finishing any task, run the following commands:
  - Check type with `bun run check`
  - Lint with `bun run lint`, all errors and warnings must be fixed
  - Format code with `bun run format` before declaring task as done
  - Run involved tests as appropriate
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
- `bun run test:integration` — integration tests (requires test databases)
- `bun run test:e2e` — Playwright E2E tests (requires test databases)
  - On NixOS, must run with `nix-shell --run "bun test:e2e"`

Test databases via `docker compose -f compose.test.yml up -d --wait`:

- Neo4j: port 7688
- Postgres: port 5433
