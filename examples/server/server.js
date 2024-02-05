const express = require("express");
const { extractTokens, classify } = require("cnft-spam-filter");
require("dotenv").config();
const app = express();
const port = 3005;

app.get("/:assetId", async (req, res) => {
  const assetId = req.params.assetId;
  const tokens = await extractTokens(assetId, process.env.RPC_URL);
  const classification = classify(tokens);
  res.send(classification);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
