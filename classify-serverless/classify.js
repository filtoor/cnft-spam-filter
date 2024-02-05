const { createWorker } = require("tesseract.js");
require("dotenv").config();
const {
  fetchMerkleTree,
  mplBubblegum,
} = require("@metaplex-foundation/mpl-bubblegum");
const { createUmi } = require("@metaplex-foundation/umi");
const { defaultPlugins } = require("@metaplex-foundation/umi-bundle-defaults");

// Analyze tree to see if proof length makes burning impossible
async function getTreeData(umi, tree_id) {
  const tree = await fetchMerkleTree(umi, tree_id);
  const proof_length =
    tree.treeHeader.maxDepth - (Math.log2(tree.canopy.length + 2) - 1);
  const proof_length_impossible = proof_length > 23; // 23 is the maximum proof length for burning a cNFT

  return { proof_length_impossible };
}

// Image OCR
async function getImageData(image_url) {
  const worker = await createWorker("eng", 1, {
    cachePath: "/tmp",
  });
  const ret = await worker.recognize(image_url);
  const image_words = ret.data.text.split(/\s+/);
  const image_contains_url = image_words.some((word) =>
    word.match(/^[\S]+[.][\S]/)
  );
  worker.terminate();

  return { image_words, image_contains_url };
}

module.exports.handler = async (event) => {
  const umi = createUmi()
    .use(defaultPlugins(process.env.RPC_URL))
    .use(mplBubblegum());

  const assetId = event.queryStringParameters.assetId;

  if (!assetId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "assetId is required" }),
    };
  }

  const response = await fetch(process.env.RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: assetId,
      method: "getAsset",
      params: {
        id: assetId,
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

  const tree_id = result.compression.tree;
  const image_url = result.content.links.image;

  // Execute tree data and image text extraction in parallel
  const [{ proof_length_impossible }, { image_words, image_contains_url }] =
    await Promise.all([getTreeData(umi, tree_id), getImageData(image_url)]);

  // Get the words from the NFT metadata
  const attribute_words = result.content.metadata.attributes.flatMap((attr) => [
    ...attr.value.split(/\s+/),
    ...attr.trait_type.split(/\s+/),
  ]);
  const description_words =
    result.content.metadata.description?.split(/\s+/) ?? "";
  const name_words = result.content.metadata.name?.split(/\s+/) ?? "";

  const words = [
    ...image_words,
    ...attribute_words,
    ...description_words,
    ...name_words,
  ]
    .filter((word) => {
      if (word === "[]") return false;
      if (word.length <= 1) return false;

      return true;
    })
    .map((word) => word.toLowerCase());

  const regex_emoji = /\p{Extended_Pictographic}/u;
  const contains_emoji = words.some((word) => regex_emoji.test(word));

  return {
    statusCode: 200,
    body: JSON.stringify({
      words,
      contains_emoji,
      proof_length_impossible,
      image_contains_url,
    }),
  };
};
