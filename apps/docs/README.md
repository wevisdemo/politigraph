# @politigraph/docs

Landing page and documentations to be built as static website

## Tech Stack

- Astro + Startlight
- Tailwind
- Vue
- v-network-graph

## Scripts

- `dev` run server in dev mode
- `build` build web as a static website

## Environment Variables

- `PUBLIC_POLITIGRAPH_URL` for GraphQL endpoint (optional, default to https://politigraph.wevis.info/graphql). Read from the root `.env` via Vite's `envDir`; the `PUBLIC_` prefix is required to expose it to browser code.
