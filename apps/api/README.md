# @politigraph/api

Backend API for GraphQL, authentication, and static file (web/assets) serving

## Tech Stack

- Elysia
- Apollo GraphQL Server

## Scripts

- `dev` run server in watch mode
- `build` build server as a single file executable using Bun

## Environment Variables

- `DATABASE_URL` postgres connection URL
- `BETTER_AUTH_URL` better auth URL, should equal to web `PUBLIC_BASE_URL`
- `BETTER_AUTH_SECRET` better auth secret
- `SIGN_UP_TOKEN` bearer token to sign up new user on production
