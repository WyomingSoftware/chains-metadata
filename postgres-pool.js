const { Pool } = require("pg");
const DB_CONNECTION = process.env.DB_CONNECTION;

// Set up the connection string
let cs = {
  connectionString:
    process.env.DB_CONNECTION + "?application_name=centurionV2-workers",
  max: process.env.DB_MAX_CONNECTIONS,
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT_MILLIS, // default is 10 seconds
  connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT_MILLIS, // default is 0 or no timeout
};

// Create the pool
const pool = new Pool(cs);

pool.on("error", (err, client) => {
  debug("> POSTGRESQL Unexpected error on idle client", err);
  try {
    loki.postLokiError(
      err,
      err.toString(),
      'Postgres: pool.on("error"), consider restart',
    );
  } catch (err) {
    console.error(err);
  }
});

async function test() {
  console.log("| DB_CONNECTION:", DB_CONNECTION);
  console.log("|  max:", cs.max);
  console.log("|  idleTimeoutMillis:", cs.idleTimeoutMillis);
  console.log("|  connectionTimeoutMillis:", cs.connectionTimeoutMillis);
  const client = await pool.connect();
  console.log(`|  Transactional processID ${client.processID}`);
  const res = await client.query("SELECT NOW()");
  client.release();

  const pgPool = await pool.query("SELECT NOW()");
  console.log(`|  Non transactional processID ${client.processID}`);
  console.log(`|  processIDs (a.k.a connectionIDs) should match`);

  console.log(`|  Pool count at startup: ${pool.totalCount}`);
  console.info("|----------------------------------------------------|");
}
test();

module.exports = pool;
