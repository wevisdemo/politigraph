# Introduction

**Politigraph** is a civic-initiated open API for Thai political data developed by [WeVis](https://wevis.info), a civic technology organization. This project is open source and available on [GitHub](https://github.com/wevisdemo/politigraph/).

We model the data using the **"graph"** data structure: a set of entities (nodes) and relationships between them (edges). The schema is based on [Popolo - International open government data specifications](https://www.popoloproject.com/) with some adjustment for Thai political context.

::schema-graph
::

Neo4j and GraphQL is our main technology stack. GraphQL endpoint and playground is available at https://politigraph.wevis.info/graphql
