# cnft-spam-filter

this is a simple utility package that classifies a cNFT on solana as either `spam` or `ham` (safe)

it uses a combination of on-chain metrics and OCR analysis fed into a naive bayes classifier

the model is trained from some hand-labeled spam and ham cNFTs

## using

you'll need an RPC URL (it only makes a few calls so it doesn't have to be crazy performant, a free plan from helius should be fine: https://www.helius.dev/)

`const { extractTokens, classify } = require("cnft-spam-filter")`

or 

`import { extractTokens, classify } from "cnft-spam-filter"`

then you can simply call

`const tokens = await extractTokens(assetId, rpcUrl)`

to perform analysis on a cNFT and convert it into tokens that we can classify:

`const classification = classify(tokens)`

you can optionally train your own model and pass it into the `classify` function:

`const classification = classify(tokens, model)`

the code for model training is available on the github under the `/train` folder