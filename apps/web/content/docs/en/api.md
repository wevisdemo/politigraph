---
lang: en
---

# API Usage

We use [Neo4jGraphQL](https://neo4j.com/docs/graphql/) as the primary tool for managing our data. Our API adheres to the [GraphQL](https://graphql.org) standard, which you can call or try building various queries for at https://politigraph.wevis.info/graphql

## Authentication

Most data from the Politigraph API is publicly accessible and does not require authentication, with the following exceptions:

- Data with the field `publish_status` that does not have the value `PUBLISHED` will not be hidden from the response because it is under review and not yet ready for disclosure.
- Any GraphQL mutation, as we prevent external parties from modifying data on our system.

Access to both of these exceptions is strictly reserved for the WeVis system administration team.

## Rate Limiting

We limit API calls to a maximum of 5 requests/second, with a maximum burst quota of 12. If you send more requests than the specified limit, you will receive a 503 error response.
