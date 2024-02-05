const { extractTokens, classify } = require("cnft-spam-filter");
require("dotenv").config();

module.exports.handler = async (event) => {
  const assetId = event.queryStringParameters.assetId;
  const rpcUrl = process.env.RPC_URL;

  try {
    const tokens = await extractTokens(assetId, rpcUrl);
    const classification = classify(tokens);

    return {
      statusCode: 200,
      body: JSON.stringify(classification),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: "error",
    };
  }
};
