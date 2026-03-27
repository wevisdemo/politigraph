# @politigraph/api

Backend API for GraphQL and authentication

## Tech Stack

- Elysia
- Apollo GraphQL Server

## Scripts

- `dev` run server in watch mode
- `build` build server as a single file executable using Bun

## Environment Variables

- `BETTER_AUTH_SECRET` - Random string used for better auth token signing
- `BETTER_AUTH_URL` - Frontend base URL
- `DATABASE_URL` - Postgres connection URL
- `NEO4J_HOST` (optional, default to localhost)
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
