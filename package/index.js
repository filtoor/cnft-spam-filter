const { createWorker } = require("tesseract.js");
const {
  fetchMerkleTree,
  mplBubblegum,
} = require("@metaplex-foundation/mpl-bubblegum");
const { createUmi } = require("@metaplex-foundation/umi");
const { defaultPlugins } = require("@metaplex-foundation/umi-bundle-defaults");
const defaultModel = require("./model.json");

// Analyze tree to get proof depth
async function getProofLength(treeId, rpcUrl) {
  const umi = createUmi().use(defaultPlugins(rpcUrl)).use(mplBubblegum());

  const tree = await fetchMerkleTree(umi, treeId);
  const proofLength =
    tree.treeHeader.maxDepth - (Math.log2(tree.canopy.length + 2) - 1);

  return { proofLength };
}

// Image OCR
// very slow, not recommended for production
// should roll your own OCR
async function getImageData(imageUrl) {
  const worker = await createWorker("eng", 1, {
    cachePath: "/tmp",
  });
  const ret = await worker.recognize(imageUrl);
  const imageWords = ret.data.text.split(/\s+/);

  worker.terminate();

  return { imageWords };
}

async function extractTokens(
  address,
  rpcUrl,
  nftData = undefined,
  proofLength = undefined,
  imageWords = undefined
) {
  if (!address || !rpcUrl) {
    throw new Error("address and rpcUrl are required");
  }

  if (!nftData) {
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
  }

  const treeId = nftData.compression.tree;
  const imageUrl = nftData.content.links.image;

  // all of this to save a few hundred ms
  // there must be a better way to do this
  if (!proofLength && !imageWords) {
    [{ proofLength }, { imageWords }] = await Promise.all([
      getProofLength(treeId, rpcUrl),
      getImageData(imageUrl),
    ]);
  } else if (!imageWords) {
    let imageData = await getImageData(imageUrl);
    imageWords = imageData.imageWords;
  } else if (!proofLength) {
    let proofData = await getProofLength(treeId, rpcUrl);
    proofLength = proofData.proofLength;
  }

  const imageContainsUrl = imageWords.some((word) =>
    word.match(/^[\S]+[.][\S]/)
  );

  // Get the words from the NFT metadata
  const attributeWords = (nftData.content.metadata.attributes ?? []).flatMap(
    (attr) => [
      ...String(attr.value).split(/\s+/),
      ...String(attr.trait_type).split(/\s+/),
    ]
  );
  const descriptionWords =
    nftData.content.metadata.description?.split(/\s+/) ?? "";
  const nameWords = nftData.content.metadata.name?.split(/\s+/) ?? "";

  // Check attribute/description/name for an emoji
  const allWords = [...attributeWords, ...descriptionWords, ...nameWords];
  const regexEmoji = /\p{Extended_Pictographic}/u;
  const containsEmoji = allWords.some((word) => regexEmoji.test(word));

  let tokens = [...imageWords, ...attributeWords] // only image and attribute words are useful for classification purposes
    .filter((word) => {
      if (word === "[]") return false;
      if (word.length <= 3) return false; // ignore words with less than 3 characters, kinda hacky but useful

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
    proofLength > 23 ? "proofLengthImpossible" : "not_proofLengthImpossible"
  );
  tokens.push(imageContainsUrl ? "imageContainsUrl" : "not_imageContainsUrl");

  return tokens;
}

function classify(tokens, model = defaultModel) {
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

async function extractAndClassify(address, rpcUrl) {
  const tokens = await extractTokens(address, rpcUrl);
  const classification = classify(tokens);

  return { classification };
}

module.exports = {
  extractTokens,
  classify,
  extractAndClassify,
  getProofLength,
  getImageData,
};
