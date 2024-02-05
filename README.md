# cnft-spam-filter

This project is an open-source, lightweight spam classifier for cNFTs.

It is built for serverless deployment, but is portable: it can be run in a serverless environment, on a server, or even in the browser.

Currently running at https://jza4yd2wf2.execute-api.us-east-1.amazonaws.com/?assetId=H82KF2Rj5nAV8ARWFb9jWLHndRiGmV8wDTsweCfDprCt

Change assetId to whatever you want to see features being extracted.

## TODO:
- Get a spam and ham set using tensor and solcinerator
- Train a naive bayes classifier on the spam and ham set and save the weights
- Classify using the trained classifier