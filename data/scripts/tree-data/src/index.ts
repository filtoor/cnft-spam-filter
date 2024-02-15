import fetch from 'node-fetch';
import { createObjectCsvWriter } from 'csv-writer';
import { Connection, PublicKey } from '@solana/web3.js';
import { ConcurrentMerkleTreeAccount } from '@solana/spl-account-compression';
const csv = require('csvtojson');

require('dotenv').config()

interface assetProof {
    jsonrpc: string,
    result: {
        root: string,
        proof: [string],
        node_index: number,
        leaf: string,
        tree_id: string
    },
    id: string
}

async function getData() {
    const data = await csv().fromFile(process.env.DATA_PATH);

    return data;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAssetProof(mint: string): Promise<assetProof> {
    const url = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_KEY}`;

    while (true) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAssetProof',
                params: {
                    id: mint
                }
            }),
        });

        if (response.status === 200) {
            const result = await response.json() as assetProof;
            return result;
        } else {
            console.log(`Received ${response.status} response code. Sleeping for 10 seconds...`);
            await sleep(10000);
        }
    }
}

async function writeObjectsToCsv(filePath: string, records: any[]) {
    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
            { id: 'image_url', title: 'image_url'},
            { id: 'mint', title: 'mint'},
            { id: 'treeHeight', title: 'treeHeight'},
            { id: 'canopyDepth', title: 'canopyDepth'}
        ],
    });

    try {
        await csvWriter.writeRecords(records);
        console.log('The CSV file was written successfully');
    } catch (err) {
        console.error('Error writing CSV file', err);
    }
}

async function main() {

    let newData = [];
    const outputPath = process.env.OUTPUT_PATH;
    const data = await getData();
    const rpc = new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_KEY}`);

    let counter = 0;

    for (const row of data) {
        const assetData =  await getAssetProof(row.mint);

        const treeID = new PublicKey(assetData.result.tree_id);
        const treeHeight = assetData.result.proof.length;

        const accountInfo = await rpc.getAccountInfo(treeID);
        const accountData = accountInfo?.data;

        const parsedAccount = ConcurrentMerkleTreeAccount.fromBuffer(accountData as Buffer);
        const canopyDepth = parsedAccount.getCanopyDepth();

        row.treeHeight = treeHeight;
        row.canopyDepth = canopyDepth;

        newData.push(row);

        console.log(`Processed record ${counter} of ${data.length}...${((counter/data.length) * 100).toPrecision(2)}% complete`);
        counter += 1;
    }
    writeObjectsToCsv(outputPath as string, newData);

}

main();