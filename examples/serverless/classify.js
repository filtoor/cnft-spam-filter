const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { extractTokens, classify, getProofLength } = require("cnft-spam-filter");
require("dotenv").config();

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  const address = event.queryStringParameters.address;
  const rpcUrl = process.env.RPC_URL;

  try {
    nftQuery = await dynamo.send(
      new GetCommand({
        TableName: "cnftTable",
        Key: {
          address: address,
        },
      })
    );
    if (nftQuery.Item) {
      return {
        statusCode: 200,
        body: JSON.stringify({ classification: nftQuery.Item.classification }),
      };
    }

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: address,
        method: "getAsset",
        params: {
          id: address,
          displayOptions: {
            showUnverifiedCollections: true,
            showCollectionMetadata: true,
            showFungible: false,
            showInscription: false,
          },
        },
      }),
    });
    const { result } = await response.json();
    nftData = result;

    const treeId = nftData.compression.tree;
    let proofLength = undefined;
    treeQuery = await dynamo.send(
      new GetCommand({
        TableName: "treeTable",
        Key: {
          address: treeId,
        },
      })
    );
    if (treeQuery.Item) {
      // if there's spam in the tree, it's a spam tree
      if (treeQuery.Item.classification === "spam") {
        return {
          statusCode: 200,
          body: JSON.stringify({
            classification: treeQuery.Item.classification,
          }),
        };
      }
      proofLength = body.Item.proofLength;
    } else {
      proofLength = await getProofLength(treeId, rpcUrl);
    }

    // do OCR on the tokens
    const tokens = await extractTokens(address, rpcUrl, nftData, proofLength);
    const classification = classify(tokens);

    // if we haven't seen the address before, add it to the table
    await dynamo.send(
      new PutCommand({
        TableName: "cnftTable",
        Item: {
          address: address,
          classification: classification,
        },
      })
    );

    // also add the tree to the table
    await dynamo.send(
      new PutCommand({
        TableName: "treeTable",
        Item: {
          address: address,
          classification: classification,
          proofLength: proofLength,
        },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ classification: classification }),
    };
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e }),
    };
  }
};
