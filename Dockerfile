FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS prerelease
COPY . .
RUN bun install --production --frozen-lockfile --ignore-scripts
ENV NODE_ENV=production
RUN bun run build

FROM base AS release
RUN bun add -g @better-auth/cli --ignore-scripts
COPY --from=prerelease /app/.output .
WORKDIR /app/server
COPY entrypoint.sh .
COPY better-auth_migrations ./better-auth_migrations
COPY schemas ./schemas
COPY utils/auth.ts .

EXPOSE 3000/tcp
ENTRYPOINT [ "sh", "entrypoint.sh" ]
