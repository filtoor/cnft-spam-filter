# serverless example

will need a .env with `RPC_URL`

`npm i`
`serverless deploy`

if you don't have `serverless` installed you'll need to follow a guide for that https://www.serverless.com/framework/docs/getting-started

this runs the filter in a lambda function, so you can spin up millions of these in parallel for cents

it's pretty slow but arguably the most scalable solution and perhaps speed can be improved upon