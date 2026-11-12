# @politigraph/api

Backend API for GraphQL and authentication

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Contents

- [Tech Stack](#tech-stack)
- [Endpoints](#endpoints)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)

<!-- END doctoc -->

## Tech Stack

- Elysia
- Apollo GraphQL Server
- Model Context Protocol SDK

## Endpoints

- `/graphql` GraphQL API and playground
- `/mcp` Model Context Protocol (Streamable HTTP), anonymous and read-only
- `/auth/*` authentication
- `/upload-image` authenticated image upload

## Scripts

- `dev` run server in watch mode
- `build` build server as a single file executable using Bun

## Environment Variables

- `BETTER_AUTH_SECRET` - Random string used for better auth token signing
- `BETTER_AUTH_URL` - Frontend base URL
- `DATABASE_URL` - Postgres connection URL
- `PUBLIC_SITE_URL` - Docs site base URL, used for analytics and the MCP docs resource (optional, default to `http://localhost:4321`, or `https://politigraph.wevis.info` when `NODE_ENV=production`)
- `NEO4J_URI` (optional, default to `neo4j://127.0.0.1:7687`)
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
