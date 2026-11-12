# @politigraph/docs

Landing page and documentations to be built as static website

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Contents

- [Tech Stack](#tech-stack)
- [Scripts](#scripts)
- [Content](#content)
- [Environment Variables](#environment-variables)

<!-- END doctoc -->

## Tech Stack

- Astro + Startlight
- Tailwind
- Vue
- v-network-graph

## Scripts

- `dev` run server in dev mode
- `build` build web as a static website
- `check` type check Astro files and tests
- `lint` lint and fix code
- `test:unit` run unit tests

## Content

Pages live in `src/content/docs/`. Thai is the default locale and the source of truth, English is mirrored under `src/content/docs/en/`. Keep both in sync.

- `introduction.mdx` the first page of the docs
- `usage/` the Usage group, one page per way of accessing the data plus `terms.mdx`
- `schema/` the Schema group

Sidebar order is defined in `astro.config.mjs`. Labels of the auto-generated groups come from `src/constants/sidebar.ts`, which `src/utils/llms.ts` also uses as llms.txt section names.

`/llms.txt`, `/llms-full.txt` (and their `-th` variants) and the `.md` version of every page are generated from the same content. `src/utils/llms.ts` converts MDX components (asides, `Accordion`, `Code`, `QueryTabs`, ...) to plain markdown, so add a rule there when introducing a new component.

## Environment Variables

- `PUBLIC_POLITIGRAPH_URL` for GraphQL endpoint (optional, default to https://politigraph.wevis.info/graphql). Read from the root `.env` via Vite's `envDir`; the `PUBLIC_` prefix is required to expose it to browser code. `QueryTabs` fetches this endpoint at build time, so the root `.env` value (`http://localhost:3000/graphql`) makes `build` fail unless the API is running. Override it to build locally, e.g. `PUBLIC_POLITIGRAPH_URL=https://politigraph.wevis.info/graphql bun run build`.
- `PUBLIC_SITE_URL` for the public site URL used in examples and generated llms files (optional, default to `http://localhost:4321` in dev and the Astro `site` in build).
