const { extractTokens, classify } = require("cnft-spam-filter");
require("dotenv").config();
const ham_ids = require("./ham_ids.json");
const spam_ids = require("./spam_ids.json");

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

  for (let id of ham_ids) {
    try {
      let tokens = await extractTokens(id, process.env.RPC_URL);
      let result = await classify(tokens);

      if (result === "ham") {
        accuracy.ham.true++;
      } else if (result === "spam") {
        accuracy.ham.false++;
      }
    } catch (e) {
      accuracy.ham.errors++;
    }
  }

  for (let id of spam_ids) {
    try {
      let tokens = await extractTokens(id, process.env.RPC_URL);
      let result = await classify(tokens);

      if (result === "ham") {
        accuracy.spam.true++;
      } else if (result === "spam") {
        accuracy.spam.false++;
      }
    } catch (e) {
      accuracy.spam.errors++;
    }
  }

  console.log(accuracy);
}

test();
