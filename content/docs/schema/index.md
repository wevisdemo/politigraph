# Schema

Schema is like a rule of how data can be structured. It defines how many type of node can it be? How many fields can each type of nodes have? And how can it connect together to form a relationship.

We design the schema based on [Popolo - International open government data specifications](https://www.popoloproject.com/) with some adjustment for Thai political context.

::schema-graph
::

Schema is not the actual data. For example, we might have Person "A", "B" and "C" which are an actual nodes with `Person` type. Those nodes will have only fields and relationships that satisfied the schema.
