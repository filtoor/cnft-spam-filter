# serverless example

will need a .env with `RPC_URL`

`serverless deploy` to deploy to AWS

if you don't have `serverless` installed and configured you'll need to follow a guide for that https://www.serverless.com/framework/docs/getting-started

this runs the filter in a lambda function, so you can spin up millions of these in parallel for cents

it's pretty slow but arguably the most scalable solution and perhaps speed can be improved upon with better caching