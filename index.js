require("dotenv").config();

var chains = require("./chains.js");
chains.syncChainMetaData();
setInterval(chains.syncChainMetaData, 600000);
