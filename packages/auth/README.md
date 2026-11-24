# @politigraph/auth

Authentication and related database management

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Contents

- [Tech Stack](#tech-stack)
- [Scripts](#scripts)
- [Audit Log](#audit-log)
- [Environment Variables](#environment-variables)

<!-- END doctoc -->

## Tech Stack

- Better Auth
- Drizzle + Bun SQL
- Postgres

## Scripts

- `generate` generate migration file from current better-auth plugins
- `migrate` migrate Postgres database to match generated migration file

## Audit Log

`audit-schema.ts` defines `audit_logs`, one row per GraphQL mutation made with a session or API key, written by the API's `audit-log` plugin: who (`user_id`, `via`, and `credential_id`: the session or API key id, from the JWT `sid` claim), what (`changes`, each root field's arguments by name), where (`node_ids`, every node id in the arguments and response) and when (`created_at`). It is kept apart from `auth-schema.ts` because `better-auth generate` rewrites that file. `db.ts` exports the Drizzle client shared by Better Auth and the API.

## Environment Variables

Managed by `@politigraph/config`. See `.env.example` at the project root for the full list.
