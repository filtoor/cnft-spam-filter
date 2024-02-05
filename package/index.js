const { createWorker } = require("tesseract.js");
const {
  fetchMerkleTree,
  mplBubblegum,
} = require("@metaplex-foundation/mpl-bubblegum");
const { createUmi } = require("@metaplex-foundation/umi");
const { defaultPlugins } = require("@metaplex-foundation/umi-bundle-defaults");
const defaultModel = require("./model.json");
console.log(defaultModel);

// Analyze tree to see if proof length makes burning impossible
async function getTreeData(umi, treeId) {
  console.log("getting image data");

  const tree = await fetchMerkleTree(umi, treeId);
  const proofLength =
    tree.treeHeader.maxDepth - (Math.log2(tree.canopy.length + 2) - 1);
  const proofLengthImpossible = proofLength > 23; // 23 is the maximum proof length for burning a cNFT

  console.log({ proofLengthImpossible });
  return { proofLengthImpossible };
}

// Image OCR
async function getImageData(imageUrl) {
  console.log("getting image data");
  const worker = await createWorker("eng", 1, {
    cachePath: "/tmp",
  });
  const ret = await worker.recognize(imageUrl);
  const imageWords = ret.data.text.split(/\s+/);
  const imageContainsUrl = imageWords.some((word) =>
    word.match(/^[\S]+[.][\S]/)
  );
  worker.terminate();

  console.log({ imageWords, imageContainsUrl });
  return { imageWords, imageContainsUrl };
}

async function extractTokens(assetId, rpcUrl) {
  if (!assetId || !rpcUrl) {
    throw new Error("assetId and rpcUrl are required");
  }

  console.log("EXTRACTING");

  const umi = createUmi().use(defaultPlugins(rpcUrl)).use(mplBubblegum());

  const response = await fetch(rpcUrl, {
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

  const treeId = result.compression.tree;
  const imageUrl = result.content.links.image;

  // Execute tree data and image text extraction in parallel
  const [{ proofLengthImpossible }, { imageWords, imageContainsUrl }] =
    await Promise.all([getTreeData(umi, treeId), getImageData(imageUrl)]);

  // Get the words from the NFT metadata
  const attributeWords = (result.content.metadata.attributes ?? []).flatMap(
    (attr) => [...attr.value.split(/\s+/), ...attr.trait_type.split(/\s+/)]
  );
  const descriptionWords =
    result.content.metadata.description?.split(/\s+/) ?? "";
  const nameWords = result.content.metadata.name?.split(/\s+/) ?? "";

  const allWords = [
    ...imageWords,
    ...attributeWords,
    ...descriptionWords,
    ...nameWords,
  ];

  const regexEmoji = /\p{Extended_Pictographic}/u;
  const containsEmoji = allWords.some((word) => regexEmoji.test(word));

  let tokens = imageWords // only image words are useful for classification purposes
    .filter((word) => {
      if (word === "[]") return false;
      if (word.length <= 1) return false;

      return true;
    })
    .map((word) => word.toLowerCase());

  const keywords = [
    "containsEmoji",
    "proofLengthImpossible",
    "imageContainsUrl",
    "not_containsEmoji",
    "not_proofLengthImpossible",
    "not_imageContainsUrl",
  ];

  tokens.filter((token) => {
    return !keywords.includes(token);
  });

  tokens.push(containsEmoji ? "containsEmoji" : "not_containsEmoji");
  tokens.push(
    proofLengthImpossible
      ? "proofLengthImpossible"
      : "not_proofLengthImpossible"
  );
  tokens.push(imageContainsUrl ? "imageContainsUrl" : "not_imageContainsUrl");

  console.log("returning", tokens);
  return tokens;
}

function classify(tokens, model = defaultModel) {
  console.log({ tokens, model });
  console.log("CLASSIFYING", tokens);
  let spam_likelihood = model.spam.size / (model.spam.size + model.ham.size);
  let ham_likelihood = 1 - spam_likelihood;
  const unique_tokens = new Set(tokens);

  unique_tokens.forEach((token) => {
    const spam_token_likelihood =
      ((model.spam.tokens[token] || 0) + 1) / (model.spam.size + 2);
    const ham_token_likelihood =
      ((model.ham.tokens[token] || 0) + 1) / (model.ham.size + 2);

    spam_likelihood *= spam_token_likelihood;
    ham_likelihood *= ham_token_likelihood;
  });

  return spam_likelihood > ham_likelihood ? "spam" : "ham";
}

module.exports = { extractTokens, classify };
