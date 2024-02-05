// from-scratch implementation of a Naive Bayes classifier for cNFT classification as spam
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

// train the classifier
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

// classify a new vector
function classify(tokens) {
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

async function download() {
  for (let i = 0; i < spam_ids.length; i++) {
    const id = spam_ids[i];
    const response = await fetch(
      `https://jza4yd2wf2.execute-api.us-east-1.amazonaws.com/?assetId=${id}`
    );
    if (response.status !== 200) {
      console.log("error fetching");
      continue;
    }
    const tokens = await response.json();
    train("spam", tokens);
    console.log(`trained ${id} as spam ${i + 1}/${spam_ids.length}`);
  }

  for (let i = 0; i < ham_ids.length; i++) {
    const id = ham_ids[i];
    const response = await fetch(
      `https://jza4yd2wf2.execute-api.us-east-1.amazonaws.com/?assetId=${id}`
    );
    if (response.status !== 200) {
      console.log("error fetching");
      continue;
    }
    const tokens = await response.json();
    train("ham", tokens);
    console.log(`trained ${id} as ham ${i + 1}/${ham_ids.length}`);
  }
}

function cleanModel() {
  const keywords = [
    "contains_emoji",
    "proof_length_impossible",
    "image_contains_url",
    "not_contains_emoji",
    "not_proof_length_impossible",
    "not_image_contains_url",
  ];

  for (let category in model) {
    for (let token in model[category].tokens) {
      if (keywords.includes(token)) continue;

      if (model[category].tokens[token] === 1) {
        delete model[category].tokens[token];
      }
    }
  }
}

async function main() {
  await download();
  cleanModel();
  console.log(model);

  // model = require("./model.json");

  const test_ids = [
    { id: "8PtEgByMYaBnB35Ya8JV4CgSKzAay3Ywuqu8Pf2kFDFT", label: "ham" },
    { id: "EdMjGxdfabg1uLxsm13NiLdWftzAvqURKvhaJnEw9kLb", label: "spam" },
  ];

  for (let i = 0; i < test_ids.length; i++) {
    const id = test_ids[i].id;
    const response = await fetch(
      `https://jza4yd2wf2.execute-api.us-east-1.amazonaws.com/?assetId=${id}`
    );
    const vector = await response.json();
    const classification = classify(vector);
    console.log(
      "classified",
      id,
      "as",
      classification,
      "expected",
      test_ids[i].label
    );
  }
}

main();
