const functions = require("@google-cloud/functions-framework");
const { createWorker } = require("tesseract.js");
require("dotenv").config();
const {
  fetchMerkleTree,
  mplBubblegum,
} = require("@metaplex-foundation/mpl-bubblegum");
const { createUmi } = require("@metaplex-foundation/umi");
const { defaultPlugins } = require("@metaplex-foundation/umi-bundle-defaults");

functions.http("classify", async (req, res) => {
  const umi = createUmi()
    .use(defaultPlugins(process.env.RPC_URL))
    .use(mplBubblegum());

  if (req.query.assetId) {
    const response = await fetch(process.env.RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: req.query.assetId,
        method: "getAsset",
        params: {
          id: req.query.assetId,
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

    // Determine whether the proof length makes the cNFT really annoying to burn
    const tree_id = result.compression.tree;
    const tree = await fetchMerkleTree(umi, tree_id);
    const proof_length =
      tree.treeHeader.maxDepth - (Math.log2(tree.canopy.length + 2) - 1);
    const proof_length_impossible = proof_length > 23; // 23 is the maximum proof length for burning a cNFT

    // Get the text contents of the image using OCR
    const image_url = result.content.links.image;
    const worker = await createWorker("eng", 1, {
      cachePath: "/tmp",
      langPath: "/tmp",
    });
    const ret = await worker.recognize(image_url);
    const image_words = ret.data.text.split(/\s+/);
    const image_contains_url = image_words.some((word) =>
      word.match(/^[\S]+[.][\S]/)
    );
    worker.terminate();

    // Get the words from the NFT metadata
    const attribute_words = result.content.metadata.attributes.flatMap(
      (attr) => [...attr.value.split(/\s+/), ...attr.trait_type.split(/\s+/)]
    );
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

    res.send({
      words,
      proof_length_impossible,
      image_contains_url,
      contains_emoji,
    });
  }
});
