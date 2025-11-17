FROM oven/bun:1 AS base
WORKDIR /app
RUN bun add -g turbo@^2.6.0

FROM base AS prepare
COPY . .
RUN turbo prune --docker @politigraph/api

FROM base AS build
ENV NODE_ENV=production
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts --production --no-cache
COPY --from=prepare /app/out/full/ .
RUN turbo build

FROM gcr.io/distroless/base AS run
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/packages/graphql/schemas ./packages/graphql/schemas
COPY --from=build /app/apps/api/dist/server .

CMD ["./server"]
