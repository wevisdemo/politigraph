# Testing Strategy Handoff

This document is a self-contained implementation plan for adding automated tests to the Politigraph monorepo. An agent picking this up should be able to complete each milestone without additional context.

## Project Context

- **Monorepo**: Turborepo with Bun workspaces.
- **Apps**:
  - `apps/admin` — Nuxt SPA (admin dashboard).
  - `apps/api` — Elysia + Apollo GraphQL backend.
  - `apps/docs` — Astro Starlight documentation site.
- **Packages**:
  - `packages/graphql` — Neo4j GraphQL schema, custom resolvers, and schema build utilities.
  - `packages/auth` — Better Auth + Drizzle + Postgres. **Skipped from testing** because it is mostly external-library configuration.
- **Current State**:
  - No unit, integration, or E2E tests.
  - `scripts/k6/graphql.js` exists for manual load testing and must stay manual.
  - `bun run check`, `bun run lint`, and `bun run format` already run in every package.
  - `apps/docs` build already runs in CI; no new work needed there.

## Decisions

- Use **Bun's built-in test runner** (`bun test`) for pure TypeScript/JavaScript tests.
- Use **Vitest + `@vue/test-utils` + `happy-dom`** for Vue composables and components in `apps/admin`.
- Use **Playwright** for E2E tests covering the main admin user journeys.
- Use **Docker Compose** for the test Neo4j instance. Neo4j Community Edition does not support multiple user databases, so a separate container is required.
- Use **the same `compose.test.yml` in CI and locally**. GitHub Actions runners support Docker Compose and service containers, so the test Neo4j instance can start in CI just as it does locally.
- Use **a separate Postgres database inside the same test container** if Postgres is ever needed. For this plan, `packages/auth` is skipped, so Postgres is only relevant for E2E if the full stack is started.
- Do **not** schedule k6 load tests in CI; keep them manual.

## What to Test and Why

| Layer           | Coverage                                                                                     | Why it stays                                                        |
| --------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Unit**        | `packages/graphql` custom resolvers, `apps/admin` utils/composables, `apps/api` auth utility | Covers edge cases and variants that E2E cannot practically hit.     |
| **Integration** | GraphQL authorization filters, `/upload-image` route, GraphQL route wiring                   | Covers anonymous access rules and route-level details the UI hides. |
| **E2E**         | All main admin user journeys                                                                 | Catches cross-package wiring bugs and verifies real user flows.     |

### Redundancy Rules

- **Keep** resolver unit tests: E2E cannot assert every name/label/translation variant.
- **Keep** GraphQL authorization integration tests: E2E runs as an authenticated admin, so anonymous visibility rules would otherwise be untested.
- **Drop** GraphQL mutation smoke tests: E2E already creates/updates/deletes through the UI, including editing individual votes and batch name correction. No separate mutation smoke test is needed in Milestone 2.
- **Keep** `getJwtToken` unit tests: E2E exercises cookie auth but not API-key/missing-auth edge cases.
- **Keep** `/upload-image` route integration tests: file conversion, auth rejection, and cleanup are hard to verify through the UI.
- **Keep** admin utility/composable unit tests: fast feedback on logic E2E hides.
- **Optional** admin component tests: E2E covers the same UI; keep only for complex math where fast feedback is valuable.

## Main Admin User Journeys for E2E

1. **Authentication**
   - Login success and failure.
   - Route guard redirects unauthenticated users to `/login`.
   - Change password.
   - Create and use an API key.
2. **People Management**
   - List people with search and pagination.
   - Create a person.
   - Edit a person.
   - Add, edit, and remove a membership.
3. **Organization Management**
   - List organizations.
   - Create and edit an organization.
   - Add and edit a post.
   - Add and edit a membership.
4. **Bill Lifecycle**
   - List bills.
   - Create and edit a bill.
   - Add bill events.
   - Link a bill to a vote event.
5. **Vote Event & Votes**
   - List vote events.
   - Create and edit a vote event.
   - Edit vote counts and individual votes.
   - Use batch name correction for invalid voter names.
   - Publish and unpublish a vote event.

## Milestones

Each milestone is a shippable increment. Add only the foundation pieces required by that milestone. After every milestone, run:

```bash
bun run check
bun run lint
bun run format
```

Fix all errors and warnings before marking the milestone complete.

---

## Milestone 1 — `packages/graphql` Unit Tests

Goal: Test pure resolver functions and schema build utilities without any database.

### Tasks

- [x] Add `"test": "bun test"` to `packages/graphql/package.json`.
- [x] Add a `test` task to `turbo.json` for `@politigraph/graphql`.
- [x] Add a root `test` script to `package.json` that runs `turbo test`.
- [x] Add a GitHub Actions job `test` that runs `bun run test`.
- [x] Write unit tests in `packages/graphql/tests/unit/custom-resolvers.test.ts`:
  - [x] `Person.name` joins firstname, middlename, and lastname; handles null middlename.
  - [x] `Person.name_en` joins English names; returns `null` when all are null.
  - [x] `Organization.abbreviation` maps `CABINET`, `HOUSE_OF_REPRESENTATIVE`, `HOUSE_OF_SENATE`, and default.
  - [x] `Organization.term` extracts the last word for house/cabinet/senate organizations; returns `null` otherwise.
  - [x] `Post.label` produces the expected label for a house organization.
  - [x] `Post.label` produces the expected label for a political party organization.
  - [x] `Vote.option_en` maps every standard Thai option to English.
  - [x] `AlternatePersonName.name` joins names correctly.
- [x] Write unit tests in `packages/graphql/tests/unit/schema-build.test.ts`:
  - [x] `getGraphqlTypeDefs()` concatenates all `.graphql` files under `schema/`.
  - [x] `getGraphqlCreateIndexQueries()` splits `indexes.cypher` correctly and trims empty entries.
- [x] Verify `bun run test --filter=@politigraph/graphql` passes locally.
- [x] Verify the new CI job passes on a PR.

### Acceptance Criteria

- `bun run test --filter=@politigraph/graphql` passes.
- `bun run check`, `bun run lint`, and `bun run format` pass.
- CI job `test-graphql-unit` is green.

---

## Milestone 2 — `packages/graphql` Neo4j Integration Tests

Goal: Verify authorization filters against a real Neo4j instance. Custom resolvers are already covered by unit tests in Milestone 1 and do not need a live database.

### Rationale

- Milestone 1 tests the custom resolvers as pure functions. Running them again through Neo4j only repeats those assertions and tests `@neo4j/graphql`'s resolver invocation, which is external-library behavior.
- Authorization filters (`@authorization` directives) cannot be verified without a real Neo4j instance because they rely on `@neo4j/graphql` translating directives into Cypher.
- The optional mutation smoke test is dropped because Milestone 5 E2E already edits individual votes and uses batch name correction, covering the same CRUD path.

### Tasks

- [ ] Add `compose.test.yml` at the repository root with a `neo4j-test` service:
  - [ ] Use `neo4j:2025.12.1`.
  - [ ] Expose `7688:7687` and `7475:7474` so it does not conflict with local dev Neo4j.
  - [ ] Set `NEO4J_AUTH` from `.env.test`.
  - [ ] Enable APOC plugins to match production.
  - [ ] Add a healthcheck.
- [ ] Add `.env.test.example` at the repository root with `NEO4J_TEST_URI`, `NEO4J_TEST_USERNAME`, and `NEO4J_TEST_PASSWORD`.
- [ ] Add `"test:integration": "bun test tests/integration"` to `packages/graphql/package.json`.
- [ ] Create `packages/graphql/tests/integration/helpers.ts`:
  - [ ] Export a `driver` connected to the test Neo4j instance using env vars.
  - [ ] Export `cleanDatabase()` that runs `MATCH (n) DETACH DELETE n`.
  - [ ] Export `buildSchema({ withAuth?: boolean })` that creates a `Neo4jGraphQL` instance from raw typeDefs via `getGraphqlTypeDefs()`, passing the existing `resolvers`, `excludeDeprecatedFields`, and an optional symmetric test auth key.
  - [ ] Export `execute(schema, source, { variables?, jwt? })` using `graphql()` from the `graphql` package.
  - [ ] Export seed helpers for `Person`, `Organization`, `Post`, `VoteEvent`, and `Vote` that accept deterministic IDs.
- [ ] Write `packages/graphql/tests/integration/authorization.test.ts` with `buildSchema({ withAuth: true })`:
  - [ ] Anonymous `people` query returns only `PUBLISHED` people.
  - [ ] Authenticated `people` query returns all people.
  - [ ] Anonymous `voteEvents` query returns only `PUBLISHED` events.
  - [ ] Anonymous `votes` query returns only votes linked to at least one `PUBLISHED` event.
  - [ ] Links whose owners are all `UNPUBLISHED` are hidden from anonymous users.
  - [ ] Memberships whose members are all `UNPUBLISHED` are hidden from anonymous users.
- [ ] Add a convenience root script `"test:integration": "turbo test:integration"` to `package.json`.
- [ ] Update GitHub Actions test job to starts `compose.test.yml` before and stop after running test.
- [ ] Verify `bun run test:integration --filter=@politigraph/graphql` passes locally.
- [ ] Verify the new CI job passes on a PR.

### Acceptance Criteria

- `bun run test:integration --filter=@politigraph/graphql` passes locally against `compose.test.yml`.
- `bun run check`, `bun run lint`, and `bun run format` pass.
- CI job `test-graphql-integration` is green.

---

## Milestone 3 — `apps/api` Tests

Goal: Test the auth utility and route behavior without a database.

### Tasks

- [ ] Add `"test": "bun test"` to `apps/api/package.json`.
- [ ] Update `turbo.json` `test` task to include `@politigraph/api`.
- [ ] Update the CI `test` workflow to also run `bun run test --filter=@politigraph/api`.
- [ ] Write unit tests in `apps/api/tests/unit/auth.test.ts`:
  - [ ] `getJwtToken` returns `null` when neither API key nor session cookie is present.
  - [ ] `getJwtToken` forwards an API key to `auth.handler`.
  - [ ] `getJwtToken` forwards a session cookie to `auth.handler`.
  - [ ] `getJwtToken` returns parsed JSON on success.
  - [ ] `getJwtToken` returns `null` on auth failure.
- [ ] Write integration tests in `apps/api/tests/integration/upload-image.test.ts`:
  - [ ] Reject upload when unauthenticated.
  - [ ] Accept upload when authenticated, convert image to webp, and write to a temporary `uploads/` directory.
  - [ ] Clean up written files after each test.
- [ ] Write integration tests in `apps/api/tests/integration/graphql-route.test.ts`:
  - [ ] Batch size over `maxBatching` returns `400` with a validation error.
  - [ ] Context function receives request headers.
  - [ ] Single valid query executes through the Elysia-Apollo handler.
- [ ] Verify `bun run test --filter=@politigraph/api` passes locally.
- [ ] Verify the updated CI job passes on a PR.

### Acceptance Criteria

- `bun run test --filter=@politigraph/api` passes.
- `bun run check`, `bun run lint`, and `bun run format` pass.
- API tests run and pass in CI.

---

## Milestone 4 — `apps/admin` Unit and Composable Tests

Goal: Add fast unit tests for utilities and composables.

### Tasks

- [ ] Install Vitest, `@vue/test-utils`, and `happy-dom` as dev dependencies in `apps/admin`.
- [ ] Add `apps/admin/vitest.config.ts` with Vue and Nuxt-compatible settings.
- [ ] Add `"test": "vitest run"` to `apps/admin/package.json`.
- [ ] Update `turbo.json` `test` task to include `@politigraph/admin`.
- [ ] Update the CI `test` workflow to also run `bun run test --filter=@politigraph/admin`.
- [ ] Write unit tests in `apps/admin/tests/unit/utils/date.test.ts`:
  - [ ] `parseDate` handles valid, invalid, and null inputs.
  - [ ] `formatDate` handles Date, ISO string, and 10-char date string.
  - [ ] `serializeDate` returns `YYYY-MM-DD` or `null`.
- [ ] Write unit tests in `apps/admin/tests/unit/utils/query.test.ts`:
  - [ ] `getStringQueryParam` handles string, array, undefined, and fallback.
  - [ ] `getNumberQueryParam` validates positive numbers and fallbacks.
  - [ ] `getArrayQueryParam` handles `ALL` expansion and arrays.
- [ ] Write unit tests in `apps/admin/tests/unit/utils/votes.test.ts`:
  - [ ] `validateVotes` detects count mismatch.
  - [ ] `validateVotes` detects duplicated votes.
  - [ ] `validateVotes` detects invalid options.
  - [ ] `validateVotes` warns about missing information.
  - [ ] `validateVotes` warns about invalid voter names.
- [ ] Write unit tests in `apps/admin/tests/unit/composables/`:
  - [ ] `useDebouncedSearch` calls `onDebouncedChange` after the delay.
  - [ ] `useToastNotification` shows, hides, and auto-dismisses.
  - [ ] `usePaginationQuery` computes offset and page count, updates route query.
- [ ] Optional: write component tests in `apps/admin/tests/unit/components/`:
  - [ ] `VotesSummary` computes table counts correctly.
  - [ ] `VotesErrorNotifications` groups errors and warnings by type.
- [ ] Verify `bun run test --filter=@politigraph/admin` passes locally.
- [ ] Verify the updated CI job passes on a PR.

### Acceptance Criteria

- `bun run test --filter=@politigraph/admin` passes.
- `bun run check`, `bun run lint`, and `bun run format` pass.
- Admin unit tests run and pass in CI.

---

## Milestone 5 — `apps/admin` E2E Main Journeys

Goal: Cover all main user journeys with Playwright against a running local stack.

### Tasks

- [ ] Install Playwright in `apps/admin`.
- [ ] Add `apps/admin/playwright.config.ts`:
  - [ ] Set `testDir` to `tests/e2e`.
  - [ ] Configure `webServer` to start the API and admin dev servers against `compose.test.yml`.
  - [ ] Use the test Neo4j instance seeded with minimal data.
- [ ] Add `"test:e2e": "playwright test"` to `apps/admin/package.json`.
- [ ] Add a root script `"test:e2e": "turbo test:e2e"` to `package.json`.
- [ ] Add a CI job `test-admin-e2e` that starts `compose.test.yml`, runs migrations/seeds if needed, and runs `bun run test:e2e --filter=@politigraph/admin`. Run this on PRs or on demand.
- [ ] Write E2E specs in `apps/admin/tests/e2e/`:
  - [ ] `auth.spec.ts`:
    - [ ] Login success.
    - [ ] Login failure shows error.
    - [ ] Unauthenticated user is redirected to `/login`.
    - [ ] Change password.
    - [ ] Create an API key.
  - [ ] `people.spec.ts`:
    - [ ] List people.
    - [ ] Search filters the list.
    - [ ] Create a person.
    - [ ] Edit a person.
    - [ ] Add and remove a membership.
  - [ ] `organizations.spec.ts`:
    - [ ] List organizations.
    - [ ] Create an organization.
    - [ ] Edit an organization.
    - [ ] Add a post.
    - [ ] Add a membership.
  - [ ] `bills.spec.ts`:
    - [ ] List bills.
    - [ ] Create a bill.
    - [ ] Edit a bill.
    - [ ] Add a bill event.
    - [ ] Link a bill to a vote event.
  - [ ] `vote-events.spec.ts`:
    - [ ] List vote events.
    - [ ] Create a vote event.
    - [ ] Edit vote counts.
    - [ ] Edit individual votes.
    - [ ] Use batch name correction.
    - [ ] Publish and unpublish the vote event.
- [ ] Add shared E2E fixtures/helpers for login, cleanup, and deterministic test data.
- [ ] Verify `bun run test:e2e --filter=@politigraph/admin` passes locally.
- [ ] Verify the new CI job passes on a PR.

### Acceptance Criteria

- `bun run test:e2e --filter=@politigraph/admin` passes locally against the test stack.
- `bun run check`, `bun run lint`, and `bun run format` pass.
- CI job `test-admin-e2e` is green.

---

## Order of Execution

1. **Milestone 1** — `packages/graphql` unit tests
2. **Milestone 2** — `packages/graphql` Neo4j integration tests
3. **Milestone 3** — `apps/api` tests
4. **Milestone 4** — `apps/admin` unit and composable tests
5. **Milestone 5** — `apps/admin` E2E main journeys

Each milestone can be branched, completed, tested, formatted, checked, and merged independently.

## Notes for the Implementing Agent

- Do not test `packages/auth` directly. It is external-library configuration.
- Do not schedule k6 load tests in CI. Leave `scripts/k6/graphql.js` as a manual tool.
- `apps/docs` build already runs in CI; no new testing work is required there.
- Keep test files next to source or under `tests/unit` / `tests/integration` / `tests/e2e` per package convention.
- Use kebab-case file names, matching the existing codebase.
- After every task, run:

  ```bash
  bun run check
  bun run lint
  bun run format
  ```

- If a milestone uncovers a bug, fix it in the same milestone and add a regression test when possible.
- In Milestone 2, do not re-test custom resolvers against Neo4j; Milestone 1 already covers them as pure functions. Focus only on authorization filters.
- Do not add separate tests for helper glue (`buildSchema`, `execute`, `cleanDatabase`, seed helpers); those are tested indirectly through the authorization specs.
- When in doubt, prefer fewer, higher-confidence tests over exhaustive low-value coverage.
