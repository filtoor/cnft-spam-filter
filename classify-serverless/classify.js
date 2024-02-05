const { extractTokens, classify } = require("cnft-spam-filter");
require("dotenv").config();

module.exports.handler = async (event) => {
  const assetId = event.queryStringParameters.assetId;
  const rpcUrl = process.env.RPC_URL;

  const tokens = await extractTokens(assetId, rpcUrl);
  const classification = classify(tokens);

  return {
    statusCode: 200,
    body: JSON.stringify({ tokens, classification }),
  };
};
