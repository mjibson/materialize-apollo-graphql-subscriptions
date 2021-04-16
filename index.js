const { ApolloServer, PubSub, gql } = require("apollo-server");
const { Client } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://materialize@localhost:6875/materialize";
const read_client = new Client({ connectionString });
const write_client = new Client({ connectionString });
read_client.connect();
write_client.connect();
const pubsub = new PubSub();
const PORT = 4000;

const typeDefs = gql`
  type Query {
    empty: Int
  }

  type Subscription {
    count: String
  }
`;

const resolvers = {
  Query: {},
  Subscription: {
    count: {
      subscribe: () => pubsub.asyncIterator(["TAIL"]),
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  subscriptions: {
    path: "/subscriptions",
  },
});

server.listen().then(({ url }) => {
  console.log(`endpoint: ws://localhost:${PORT}${server.subscriptionsPath}`);
  console.log("Query at studio.apollographql.com/dev");
});

// Fix any possible bad txn state and begin a TAIL using DECLARE.
function tail() {
  read_client.query(
    "ROLLBACK; BEGIN; DECLARE c CURSOR FOR TAIL v;",
    (err, res) => {
      if (err) {
        console.log(err);
        setTimeout(tail, 1000);
        return;
      }
      fetch();
    }
  );
}

// FETCH from the cursor in a loop.
function fetch() {
  read_client.query("FETCH ALL c", (err, res) => {
    if (err) {
      console.log(err);
      setTimeout(tail, 1000);
      return;
    }
    res.rows.forEach((row) => {
      console.log("row", row);
      // We know there's only one row, so we publish any additions as the current
      // value of the subscription.
      if (row.diff > 0) {
        pubsub.publish("TAIL", { count: row.count });
      }
    });
    setTimeout(fetch);
  });
}

// Create the initial table and view.
async function init() {
  await write_client.query("DROP VIEW IF EXISTS v");
  await write_client.query("DROP TABLE IF EXISTS t");
  await write_client.query("CREATE TABLE t (i INT)");
  await write_client.query(
    "CREATE MATERIALIZED VIEW v AS SELECT count(*) FROM t"
  );
  setTimeout(insert);
  setTimeout(tail);
}

// Insert a value into the table each second.
async function insert() {
  await write_client.query("INSERT INTO t VALUES (1)");
  setTimeout(insert, 1000);
}

init();
