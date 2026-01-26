FROM oven/bun:1 AS base
ENV NODE_ENV=production
WORKDIR /app
RUN bun add -g turbo@^2.6.0

FROM base AS prepare
WORKDIR /app/api
COPY . .
RUN turbo prune --docker @politigraph/api
WORKDIR /app/admin
COPY . .
RUN turbo prune --docker @politigraph/admin
WORKDIR /app/site
COPY . .
RUN turbo prune --docker @politigraph/site

FROM base AS build-api
COPY --from=prepare /app/api/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts --production --no-cache
COPY --from=prepare /app/api/out/full/ .
RUN turbo build

FROM base AS build-admin
ARG BASE_URL
ENV NUXT_PUBLIC_BASE_URL=$BASE_URL
COPY --from=prepare /app/admin/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts --production --no-cache
COPY --from=prepare /app/admin/out/full/ .
RUN turbo build

FROM base AS build-site
COPY --from=prepare /app/site/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts --production --no-cache
COPY --from=prepare /app/site/out/full/ .
RUN turbo build

FROM gcr.io/distroless/base AS run
ENV NODE_ENV=production
ARG BASE_URL
ENV BETTER_AUTH_URL=$BASE_URL
WORKDIR /app
COPY --from=build-api /app/apps/api/dist/server .
COPY --from=build-site /app/apps/site/dist ./public
COPY --from=build-admin /app/apps/admin/.output/public ./public/admin

CMD ["./server"]
