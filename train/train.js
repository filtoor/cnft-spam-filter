// from-scratch implementation of a Naive Bayes classifier for cNFT classification as spam
const { extractTokens } = require("cnft-spam-filter");
const fs = require("fs");
require("dotenv").config();

const spam_ids = require("./spam_ids.json");
const ham_ids = require("./ham_ids.json");

let model = {
  spam: {
    tokens: {
      contains_emoji: 0,
      proof_length_impossible: 0,
      image_contains_url: 0,
    },
    size: 0,
  },
  ham: {
    tokens: {
      contains_emoji: 0,
      proof_length_impossible: 0,
      image_contains_url: 0,
    },
    size: 0,
  },
};

// train the classifier on one category/tokens pair
function train(category, tokens) {
  model[category].size += 1;

  const unique_tokens = new Set(tokens);
  unique_tokens.forEach((token) => {
    if (!model[category].tokens[token]) {
      model[category].tokens[token] = 0;
    }
    model[category].tokens[token] += 1;
  });
}

// download and train the classifier on the spam and ham categories
async function downloadAndTrain() {
  for (let i = 0; i < spam_ids.length; i++) {
    const id = spam_ids[i];
    const tokens = await extractTokens(id, process.env.RPC_URL);
    train("spam", tokens);
    console.log(`trained ${id} as spam ${i + 1}/${spam_ids.length}`);
  }

  for (let i = 0; i < ham_ids.length; i++) {
    const id = ham_ids[i];
    const tokens = await extractTokens(id, process.env.RPC_URL);
    train("ham", tokens);
    console.log(`trained ${id} as ham ${i + 1}/${ham_ids.length}`);
  }
}

function cleanModel() {
  const keywords = [
    "containsEmoji",
    "proofLengthImpossible",
    "imageContainsUrl",
    "not_containsEmoji",
    "not_proofLengthImpossible",
    "not_imageContainsUrl",
  ];

  for (let category in model) {
    for (let token in model[category].tokens) {
      if (keywords.includes(token)) continue;

      if (model[category].tokens[token] < 2) {
        delete model[category].tokens[token];
      }
    }
  }
}

async function main() {
  await downloadAndTrain();
  cleanModel();
  fs.writeFileSync("model.json", JSON.stringify(model));
  console.log("model saved to model.json");
}

main();
