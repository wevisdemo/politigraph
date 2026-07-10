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
- `NEO4J_URI` (optional, default to `neo4j://127.0.0.1:7687`)
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
