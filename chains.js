const { ethers } = require("ethers");
const LOCATION = "chain.js";
var pgPool = require("./postgres-pool");

const { setChainMetadata } = require("./database");

async function syncChainMetaData() {
  console.time(`>>> syncChainMetaData`);
  const ts = Date.now();
  try {
    const chainsRes = await pgPool.query(
      `select chain_id, enabled, name, providers, network_id
         from CHAINS where enabled = true ORDER BY name`,
    );
    let chains = chainsRes.rows;

    // Get on-chain meta data
    const p = await Promise.allSettled(
      chains.map((chain) => getMetaData(chain)),
    );
    let dbJSON = [];
    p.forEach((el) => {
      if(el.status === 'fulfilled')
      dbJSON.push({
        chain_id: el.value.chain_id,
        url:el.value.url,
        data: { gas: el.value.gas, blocks: undefined },
        ts:ts,
      });
      else dbJSON.push({
        chain_id: el.reason.chain_id,
        url:undefined,
        data: undefined,
        ts:ts,
      });
    });
    await setChainMetadata(dbJSON)
  } catch (err) {
    console.error(">>> root level error catch");
    console.error(err);
  } finally {
    console.timeEnd(`>>> syncChainMetaData`);
  }
}

async function getMetaData(chain) {
  let success = false;
  let gas = undefined;
  let url = undefined;
  let urlAttempts = 0;

  // Convert chain.providers.rpc to an array and sort by blockNumber
  let urlsArr = [];
  for (const key in chain.providers.rpc) {
    urlsArr.push({
      url:key,
      blockNumber: chain.providers.rpc[key].blockNumber,
    });
  }
  urlsArr.sort((a, b) => b.blockNumber - a.blockNumber);

  // Try all urls until one works
  for (let i = 0; i < urlsArr.length; i++) {
    url = urlsArr[i].url;
    urlAttempts++;
    try {
      const provider = new ethers.providers.StaticJsonRpcProvider(
        { url: url, timeout: 7298 },
        chain.networkId,
      );
      gas = await provider.getFeeData();
      success = true;
      break;
    } catch (err) {
      success = false;
      console.error(`--- ERROR ${chain.name} ---`);
      console.error(err);
    }
  }

  // Return promise results
  return new Promise((resolve, reject) => {
    if (!success) {
      reject({
        chain_name: chain.name,
        chain_id: chain.chain_id,
        urlCount: urlsArr.length,
        urlAttempts: urlAttempts,
      });
    } else {
      resolve({
        chain_name: chain.name,
        chain_id: chain.chain_id,
        url: url,
        urlCount: urlsArr.length,
        urlAttempts: urlAttempts,
        gas: gas,
      });
    }
  });
}

/**
 * Exported functions
 */
module.exports = {
  syncChainMetaData: syncChainMetaData,
};
