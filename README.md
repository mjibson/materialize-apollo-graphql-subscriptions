# GraphQL Subscriptions with Apollo and Materialize

This example demonstrates a basic subscription operation in [Apollo](https://www.apollographql.com/) with [materialize TAIL](https://materialize.com/docs/sql/tail/).

The example server exposes one subscription (`count`) that returns an integer that's incremented on the server every second.

After you start up this server, you can test out running a subscription with the Apollo Studio Explorer or GraphQL Playground. You'll see the subscription's value update every second.

## Run locally

Start materialize:

```shell
docker run --rm -it -p 6875:6875 materialize/materialized:v0.7.2
```

Then start the Apollo server:

```shell
yarn install
yarn start
```

Then use https://studio.apollographql.com/dev to view.
