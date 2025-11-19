# Politigraph

A (WIP) civic-initiated open API for Thai political data

To learn more about the data and API, visit the [documentations](https://politigraph.wevis.info/docs)

> [!WARNING]
> We are not responsible for any misinformation or consequence of any usage on our data. These open data are collected, transformed, validated, and published by us, a civil society, to push the open API standard in Thailand. We are not the official government institution who originally own and responsible in publishing these data. Please send us any feedback or suggestion via team@wevis.info or create an issue on GitHub.

## 1. The Monorepo

Managed with [Turborepo](https://turborepo.com/)

- **/apps** : Application repository
  - **/api** : Backend API for GraphQL, authentication, and static file (web/assets) serving
  - **/web** : Landing page, admin panel, and document to be rendered as SPA
- **/packages** : Shared packages between app
  - **/auth** : Authentication and related database management
  - **/graphql** : Schemas and custom resolvers implementation

## 2. Routes and Deployment

Main routes of the final application:

- `/` A landing page for public
- `/admin` Admin panel for managing politigraph data (required an account)
- `/docs` Public documentations. Auto generated from markdown files in `/content/docs` folder.
- `/graphql` GraphQL endpoint and playground for querying and updating data.

https://politigraph.wevis.info will be deployed through GitHub Actions every time the repository code has updated.

## 3. Set Up Local Development

Following these steps will help you set up Politigraph on your local development environment.

### 3.1 Environment Variables

Add following variables to the root `.env` (for docker) and `/api/.env` (for API) to config neo4j credential. Both file must be the same.

```env
NEO4J_USERNAME=<SOME_USER_NAME>
NEO4J_PASSWORD=<SOME_INITIAL_PASSWORD>
```

### 3.2 Start Neo4j and Postgres Containers

Using Docker Compose

```bash
docker compose up -d
```

Neo4j API will be running at `http://localhost:7687` with web UI at `http://localhost:7474` and the data is stored in `.neo4j` folder in your project root.

Postgres will be running at `http://localhost:5342` and the data will ve stored in docker volume.

### 3.3 Start apps' development server

Requires [Bun](https://bun.com/)

```sh
bun i	# Install dependencies for the first time
bun dev
```

Web will be started and accessible at `http://localhost:8000` while API will be availabled at `http://localhost:3000`

Web server in dev mode will pass request request from `/api` and `/graphql` in port 8000 to the API at port 3000, so auth cookie will be pass correctly.

### 3.4 Create user account (for admin access)

You need to create an account first to login to the admin panel, by making a POST request to `/auth/sign-up/email` with header `Origin: http://localhost:3000` and the following body:

```json
{
	"name": "*****",
	"email": "*****",
	"password": "*****"
}
```

## 4. References

### 4.1 GraphQL API authentication

GraphQL required user account for **write** permission. To make an update to GraphQL outside the Politigraph website, you need to create an API key by logging in into the Admin Panel (/admin) > Profile Menu > API Keys. Then add `x-api-key: KEY_VALUE` to the header when making a request.

### 4.2 Dump production database to local

To make local neo4j have up-to-dated data, we have a script to use rsync to download production database while local neo4j docker service in not running:

```shell
bun run db:pull
```
