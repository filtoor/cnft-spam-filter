# cnft-spam-filter

An open-source, lightweight, and portable spam classifier for cNFTs on Solana with 96% accuracy.

Can run anywhere that webassembly runs: on a server, in a lambda function, and *even running entirely in your browser*:

https://github.com/solarnius/cnft-spam-filter/assets/157436846/3bd2788e-84e1-41b7-8600-a297a99696f3

Also included is the model training code and data, so you can train and bring your own model if the default model is not performing well.

Feature extraction is done with a combination of on-chain data and OCR using the [tesseract.js library](https://github.com/naptha/tesseract.js). Classification is done with naive bayes and a hand-picked set of `spam` and `ham` cNFTs.


## Live Example

You can try a live (slow + heavily rate limited) example of the library running on AWS Lambda here: 

[https://jza4yd2wf2.execute-api.us-east-1.amazonaws.com/?assetId=A1xhLVywcq6SeZnmRG1pUzoSWxVMpS6J5ShEbt3smQJr](https://jza4yd2wf2.execute-api.us-east-1.amazonaws.com/?assetId=A1xhLVywcq6SeZnmRG1pUzoSWxVMpS6J5ShEbt3smQJr)

Try a new cNFT by replacing the `assetId={...}` parameter. The classifier will either spit out "spam" or "ham" (or "error" if something went wrong).

Lambda is by far the slowest execution environment due to cold start and OCR taking ~10s/cNFT compared to sub 1s/cNFT on servers/clientside, but this should give you a playground for testing the library.

## Installation

First, install the library:

`npm i cnft-spam-filter`

then import the requisite functions:

`const { extractTokens, classify } = require("cnft-spam-filter")`

or 

`import { extractTokens, classify } from "cnft-spam-filter"`

Finally, call the functions wherever you want to classify:

```js
const tokens = await extractTokens(assetId, rpcUrl);
const classification = classify(tokens);
```

Note that you'll need to bring your own `rpcUrl` that supports the `DAS` api--I recommend Helius for their generous free plan https://www.helius.dev/.

## Examples

You can find a few lightweight examples of how to use the library in different environments in the [/examples folder](https://github.com/solarnius/cnft-spam-filter/tree/main/examples) of the repository.

`cnft-spam-filter` aims to be portable, so you can run it in pretty much any environment that you want.

## Training

You can train your own model and pass it to `classify(tokens, model)`. Code for this is in the [/train folder](https://github.com/solarnius/cnft-spam-filter/tree/main/train).

You'll see `spam_ids.json` and `ham_ids.json` there; these are the cNFTs used to train the model.

## Testing

You can test the accuracy of a model using the code in the [/test folder](https://github.com/solarnius/cnft-spam-filter/tree/main/train). Make sure that your training set and test set do not overlap. It should spit out a confusion matrix as well as all of the mistakes made:


<img width="436" alt="10" src="https://github.com/solarnius/cnft-spam-filter/assets/157436846/edade4d2-4d70-4768-a5a0-631bda8cd9fa">


## Usage in Production

If you want to use `cnft-spam-filter` in production, I recommend setting up a caching layer so that you don't have to analyze each cNFT multiple times. This should be done at your own app level: you can use redis, a database, localstorage--whatever you want.

## Contributing

Feel free to open pull requests to contribute if you think this is interesting! I will try to get to them as best as I can. There are definitely some tasks that need to be implemented.

## License

All code is released under the [MIT license](https://opensource.org/license/mit/) -- go crazy.

Solana/USDC donations are appreciated but not required by any means: 

`solarnius.sol`
