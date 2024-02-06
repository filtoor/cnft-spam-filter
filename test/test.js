const { extractTokens, classify } = require("cnft-spam-filter");
require("dotenv").config();
const ham_ids = require("./ham_ids.json");
const spam_ids = require("./spam_ids.json");
const model = require("./model.json");

function printAccuracy(accuracy, mistakes) {
  const true_spam = accuracy.spam.true;
  const false_spam = accuracy.spam.false;
  const true_ham = accuracy.ham.true;
  const false_ham = accuracy.ham.false;

  const confusion_matrix = {
    "spam (actual)": {
      "spam (predicted)": true_spam,
      "ham (predicted)": false_ham,
    },
    "ham (actual)": {
      "spam (predicted)": false_spam,
      "ham (predicted)": true_ham,
    },
  };

  console.clear();
  console.table(confusion_matrix);
  console.log(mistakes);
}

async function test() {
  let accuracy = {
    spam: {
      true: 0,
      false: 0,
      errors: 0,
    },
    ham: {
      true: 0,
      false: 0,
      errors: 0,
    },
  };
  let mistakes = [];

  for (let id of ham_ids) {
    try {
      let tokens = await extractTokens(id, process.env.RPC_URL);
      let result = await classify(tokens, model);

      if (result === "ham") {
        accuracy.ham.true++;
      } else if (result === "spam") {
        accuracy.spam.false++;
        mistakes.push(id);
      }
    } catch (e) {
      accuracy.ham.errors++;
    }
    printAccuracy(accuracy, mistakes);
  }

  for (let id of spam_ids) {
    try {
      let tokens = await extractTokens(id, process.env.RPC_URL);
      let result = await classify(tokens, model);

      if (result === "spam") {
        accuracy.spam.true++;
      } else if (result === "ham") {
        accuracy.ham.false++;
        mistakes.push(id);
      }
    } catch (e) {
      accuracy.spam.errors++;
    }
    printAccuracy(accuracy, mistakes);
  }

  printAccuracy(accuracy, mistakes);
}

test();
