# Politigraph

[WIP] A Thai politics database

## Stack

- Nuxt
- Better-Auth
- Apollo GraphQL Server
- Neo4J

## Set Up

### Environment Variables

Add following variables to the `.env`

```env
NEO4J_HOST=localhost
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<SOME_PASSWORD>
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<RANDOM_STRING>
```

### Start Development Server

```sh
npm i	# Install dependencies for the first time
npm run dev
```

### Create User Account

Make a POST request to `/auth/sign-up/email` with the body:

```json
{
	"name": "*****",
	"email": "*****",
	"password": "*****"
}
```

## GraphQL Usage

GraphQL is available at `/graphql` with a playground enabled on the local environment.

### API Authentication

GraphQL required user account for **write** permission. To make an update to GraphQL outside the Politigraph website, make a POST request to `/auth/sign-in/stateless` with the body to get the token.

```json
{
	"email": "*****",
	"password": "*****"
}
```

Then you can include the token in `Authorization: Bearer <token>` headers of GraphQL request to get the write permission.

### Tunneling to Production Politigraph

```shell
ssh -L 7687:localhost:7687 dev@politigraph
ssh -L 7474:localhost:7474 dev@politigraph
```
