---
lang: en
---

# Introduction

**"Politigraph"** is a Thai politics database developed by [WeVis](https://wevis.info), a Thai civic-technology team. The code is open-source and accessible via [GitHub](https://github.com/wevisdemo/politigraph/)

<cv-inline-notification kind="warning" title="Politigraph is under an early development">
  <template #subtitle> Some data and functionality are not available yet.</template>
</cv-inline-notification>

<cv-inline-notification lowContrast kind="info" title="For general user who want to understand Thai parliamentary data">
  <template #subtitle>
    We recommend <a href="https://parliamentwatch.wevis.info" target="_blank">Parliament Watch</a> which organize and visalized data from politigraph in a friendly format.
  </template>
</cv-inline-notification>

Politigraph store the data in the **"Graph"** structure which consist of

1. **"Node"** representing each entity in the database (has circle symbol). Each node have they own data called **"property"** such as a node representing person might have properties of first name, last name, birthdate, etc.

2. **"Relationship"** or sometime called edge (has arrow symbol) representing a relationship between two nodes.

![Graph data structure](https://neo4j.com/docs/getting-started/_images/graph_concept_three_nodes-arr.svg)

Due to the large number of nodes and relationships in Politigraph, we need to extract data for each point of interest. We call the code writing process to select nodes and relationships of interest **"query"** and the returned data **"response"**, which is in JSON format: machine-readable and convenient for further use. However, to make it easier to visualize, we will visualize the response in this documentation in the form of a graph.

For example, if we want to know _"Which vote event did Anutin Charnvirakul were agreeing with?"_ We can query a node representing him and the relationships that lead to the votes he were agreeing and the vote event.

<QueryGraph query="query People($where: PersonWhere, $votesWhere2: VoteWhere) { people(where: $where) { id name name_en image votes(where: $votesWhere2) { id option_en vote_events { id title nickname result start_date end_date } } } }" :variables='{ "where": { "firstname_en_EQ": "Anutin", "lastname_en_EQ": "Charnvirakul" }, "votesWhere2": { "option_EQ": "เห็นด้วย" } }'></QueryGraph>

We use [Neo4jGraphQL](https://neo4j.com/docs/graphql/) as a main tools to manage the database and creating API in the [GraphQL](https://graphql.org) standard. You can try building and calling a query at https://politigraph.wevis.info/graphql
