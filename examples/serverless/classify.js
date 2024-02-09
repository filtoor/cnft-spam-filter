const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  LambdaClient,
  ListFunctionsCommand,
  InvokeCommand,
} = require("@aws-sdk/client-lambda");
const { extractTokens, classify, getProofLength } = require("cnft-spam-filter");
require("dotenv").config();

const client = new DynamoDBClient({});
const lambdaClient = new LambdaClient({ region: "us-east-1" });

const dynamo = DynamoDBDocumentClient.from(client);
let startTime;

module.exports.handler = async (event) => {
  startTime = new Date().getTime();
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
    console.log(
      `Address not found in table, RPC fetch ${
        new Date().getTime() - startTime
      }`
    );

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

    const treeId = nftData.compression?.tree;
    let proofLength = undefined;

    console.log(
      `Fetch complete, looking for tree ${new Date().getTime() - startTime}`
    );

    if (treeId) {
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
        console.log(
          `Tree not found, getting proof length ${
            new Date().getTime() - startTime
          }`
        );
        let receivedProofLength = await getProofLength(treeId, rpcUrl);
        proofLength = receivedProofLength.proofLength;
      }
    } else {
      proofLength = 0; // idk technically a noncompressed nft is a tree of length 0 right? xd
    }

    const imageUrl = nftData.content.links.image;
    let imageWords = undefined;
    console.log(`Invoking OCR ${new Date().getTime() - startTime}`);
    try {
      const response = await lambdaClient.send(
        new InvokeCommand({
          FunctionName: "classify-serverless-dev-tesseract-ocr",
          Payload: JSON.stringify({
            image_url: imageUrl,
          }),
        })
      );
      const lambdaData = JSON.parse(Buffer.from(response.Payload).toString());
      imageWords = JSON.parse(lambdaData.body);
    } catch (e) {
      console.log(e);
    }

    console.log(
      `OCR complete, extracting tokens ${new Date().getTime() - startTime}`
    );
    const tokens = await extractTokens(
      address,
      rpcUrl,
      nftData,
      proofLength,
      imageWords
    );
    console.log(`Classifying tokens ${new Date().getTime() - startTime}`);
    const classification = classify(tokens);

    console.log(`Saving classification ${new Date().getTime() - startTime}`);
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

    console.log(`Returning ${new Date().getTime() - startTime}`);

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
