var pgPool = require("./postgres-pool");
const format = require("pg-format");

async function setChainMetadata(data) {
  const client = await pgPool.connect();

  // Create the batch
  let batch = [];
  for(let i=0; i<data.length; i++){
    const row = data[i];

    batch.push([
      row.chain_id,
      row.url,
      row.data,
      row.ts
    ]);
  }

  // Update the database
  try{
    let query = format(
      `INSERT INTO CHAINS_METADATA(chain_id, url, data, ts) 
       VALUES %L`,
       batch,
    );
    await client.query("BEGIN");
    await client.query(query);
    await client.query("COMMIT");
  }
  catch(err){
    await client.query("ROLLBACK");
    throw(err)
  }
  finally{
    client.release();
  }

}

/**
 * Exported functions
 */
module.exports = {
  setChainMetadata: setChainMetadata,
};
