const { extractTokens, classify } = require("cnft-spam-filter");
require("dotenv").config();
const ham_ids = require("./ham_ids.json");
const spam_ids = require("./spam_ids.json");
const model = require("./model.json");

let times = [];

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

  const avg_time = times.reduce((a, b) => a + b, 0) / times.length;
  const median_time = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

  console.clear();
  console.table(confusion_matrix);
  console.log(`avg time: ${avg_time}ms`);
  console.log(`median time: ${median_time}ms`);
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
      const startTime = new Date().getTime();
      let tokens = await extractTokens(id, process.env.RPC_URL);
      let result = await classify(tokens, model);
      const endTime = new Date().getTime();
      times.push(endTime - startTime);

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
      const startTime = new Date().getTime();
      let tokens = await extractTokens(id, process.env.RPC_URL);
      let result = await classify(tokens, model);
      const endTime = new Date().getTime();
      times.push(endTime - startTime);

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
