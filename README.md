# Politigraph

[WIP] An open Thai political database

To learn more about the data and API, visit the [documentations](https://politigraph.wevis.info/docs)

## 1. Stack

- Nuxt + Nuxt Content
- Better-Auth
- GenQL
- Neo4JGraphQL + Apollo GraphQL Server

## 2. Routes and Deployment

Main routes of the web application:

- `/` A landing page for public
- `/admin` Admin panel for managing politigraph data (required an account)
- `/docs` Public documentations. Auto generated from markdown files in `/content/docs` folder.
- `/graphql` GraphQL endpoint and playground for querying and updating data.

https://politigraph.wevis.info will be deployed through GitHub Actions every time the repository code has updated.

## 3. Set Up Local Development

Following these steps will help you set up Politigraph on your local development environment.

### 3.1 Environment Variables

Add following variables to the `.env`

```env
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<SOME_INITIAL_PASSWORD>
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<RANDOM_STRING>
```

Better-Auth secret can be obtained from Better-Auth's [Generate secret button](https://www.better-auth.com/docs/installation)

### 3.2 Start Neo4j Server

Using Docker Compose

```bash
docker compose up -d
```

Neo4j API will be running at `http://localhost:7687` with web UI at `http://localhost:7474`

Neo4j data is stored in `.neo4j` folder in your project root.

### 3.3 Start development server

Requires Node.js

```sh
npm i	# Install dependencies for the first time
npm run dev
```

Then politigraph will be accessible at `http://localhost:3000`

### 3.4 Create user account (for admin access)

You need to create an account first to login to the admin panel, by making a POST request to `/auth/sign-up/email` with the following body:

```json
{
	"name": "*****",
	"email": "*****",
	"password": "*****"
}
```

## References

### GraphQL API authentication

GraphQL required user account for **write** permission. To make an update to GraphQL outside the Politigraph website, you need to create an API key by logging in into the Admin Panel (/admin) > Profile Menu > API Keys. Then add `x-api-key: KEY_VALUE` to the header when making a request.

### Tunneling to Neo4j on production server

To access Neo4j on the production on local environment

```shell
ssh -L 7687:localhost:7687 dev@politigraph
ssh -L 7474:localhost:7474 dev@politigraph
```
