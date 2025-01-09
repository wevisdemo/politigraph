# Politigraph

[WIP] A Thai politics database

## Deployment

Using GitHub Actions to build and deploy Docker container

| Name    | Trigger              | URL                                    |
| ------- | -------------------- | -------------------------------------- |
| Staging | Code pushed / manual | https://politigraph-staging.wevis.info |

## Environment Variables

```env
NEO4J_HOST=localhost
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=
```

## Set Up

### Create User Account

Make a POST request to `/auth/sign-up/email` with the body:

```json
{
	"name": "*****",
	"email": "*****",
	"password": "*****"
}
```

### API Authentication

GraphQL required user account for write permission. To make an update to GraphQL outside the Politigraph website, make a POST request to `/auth/sign-in/stateless` with the body:

```json
{
	"email": "*****",
	"password": "*****"
}
```

Token will be returned from the response, and you can add `Authorization: Bearer <token>` with GraphQL request to get the permission.
