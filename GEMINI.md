# Politigraph

## General Instructions

- Always use bun as a package manager and JavaScript runtime
- The Github owner and repo is wevisdemo/politigraph
- Do not use CSS style block if not necessary, using Tailwind classes is preferable

## Folder Structure

This project is a monorepo managed by Turborepo

- /apps/admin : Application repository
- /apps/api : Backend API for GraphQL, authentication, and static file (web/assets) serving
- /apps/docs : Landing page and documentations to be built as static website
- /packages/auth : Authentication and related database management
- /packages/graphql : Schemas and custom resolvers implementation

More information on tech stack of each project can be found in the respective README.md files.
