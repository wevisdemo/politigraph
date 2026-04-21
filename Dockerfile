FROM oven/bun:1 AS base
ENV NODE_ENV=production
WORKDIR /app
RUN bun add -g turbo@^2.6.1

FROM base AS prepare
COPY . .
RUN turbo prune --docker @politigraph/api

FROM base AS build
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts --production --no-cache
COPY --from=prepare /app/out/full/ .
RUN turbo build

FROM gcr.io/distroless/cc AS run
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/api/dist/ .

CMD ["./server"]
