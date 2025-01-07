FROM node:22-alpine AS base
RUN apk add --no-cache python3 make gcc g++
WORKDIR /app


FROM base AS prerelease
COPY . .
RUN npm ci

ENV NODE_ENV=production
RUN npm run build


FROM base AS release
RUN npm i -D @better-auth/cli
RUN mkdir .better-auth

COPY --from=prerelease /app/.output .
COPY entrypoint.sh .
COPY migrations .
COPY schemas/politic.graphql ./schemas/
COPY tsconfig.json .
COPY utils/auth.ts .

EXPOSE 3000/tcp
ENTRYPOINT [ "sh", "entrypoint.sh" ]
