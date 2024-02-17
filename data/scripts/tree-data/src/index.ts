import fetch from 'node-fetch';
import { createObjectCsvWriter } from 'csv-writer';
import { Connection, PublicKey } from '@solana/web3.js';
import { ConcurrentMerkleTreeAccount } from '@solana/spl-account-compression';
const csv = require('csvtojson');
const chunk = require('lodash.chunk');

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
        try {
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
            console.log(`Received ${response.status} response code. Sleeping for 5 seconds...`);
            await sleep(5000);
        }

    } catch (error) {
        console.log('Trying fetch again after error...', error);
        await sleep(10000)
        continue;
    } 
}
}

async function getCanopyDepth(treeID: PublicKey) {
    const rpc = new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_KEY}`);

    const accountInfo = await rpc.getAccountInfo(treeID);
    const accountData = accountInfo?.data;

    const parsedAccount = ConcurrentMerkleTreeAccount.fromBuffer(accountData as Buffer);
    const canopyDepth = parsedAccount.getCanopyDepth();

    return canopyDepth;
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
    const treeData = new Map();
    const data = await getData();
    let chunks = chunk(data, 80);
    let assetResults: any = [];
    const newData: any = [];

    let counter = 0;

    for (const c of chunks) {
        const assetPromises: any = [];

        for (const row of c) {
            assetPromises.push(getAssetProof(row.mint));
        }

        assetResults = assetResults.concat(await Promise.all(assetPromises));

        await sleep(2500);
        
        counter += 80;

        console.log(`Processed getAssetProof for ${counter} of ${data.length} records...${((counter / data.length) * 100).toFixed(3)}% complete`);
    }

    const neededTrees = new Set();

    for (const asset of assetResults) {
        neededTrees.add(asset.result.tree_id);
        asset.result.treeHeight = asset.result.proof.length;
    }

    for (const tree of [...neededTrees]) {
        const account = new PublicKey(tree as string);
        const data = await getCanopyDepth(account);
        treeData.set(tree, data);
    }

    for (let i = 0; i < assetResults.length; i++) {
        data[i].treeHeight = assetResults[i].result.treeHeight;
        data[i].canopyDepth = treeData.get(assetResults[i].result.tree_id);

        newData.push(data[i]);
    }

    writeObjectsToCsv(process.env.OUTPUT_PATH as string, newData);
}

main();