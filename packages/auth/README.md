# @politigraph/auth

Authentication and related database management

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Contents

- [Tech Stack](#tech-stack)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)

<!-- END doctoc -->

## Tech Stack

- Better Auth
- Drizzle + Bun SQL
- Postgres

## Scripts

- `generate` generate migration file from current better-auth plugins
- `migrate` migrate Postgres database to match generated migration file

## Environment Variables

Managed by `@politigraph/config`. See `.env.example` at the project root for the full list.
