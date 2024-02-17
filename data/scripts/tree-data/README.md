# Tree Data Script

This script is used to grab cNFT tree height and canopy depth for  the [Sol-Incinerator](https://sol-incinerator.com/) data.

## Setup

Rename ``.env.example`` to ``.env``

Inside of ``.env`` provide the following:

``HELIUS_KEY`` - API key for your [Helius](https://www.helius.dev/) account.

``DATA_PATH`` - Path to the data source.

``OUTPUT_PATH`` -  Path where the finished csv file is saved.

## Build & Run

Move into the project directory and run ``yarn install``

After installation run ``yarn ts-node ./src/index.ts``

## Notes

### Time Expectations
This script can take some time to run. You should expect to consume around 800k credits on the incinerator data. You can tweak the batch sizes on line ``102`` and timeout between batches on line ``117``. A batch size of 80 was found to be adequate.

### Modifications for Other Data Sources

If you are modifying this script to for another data source there are a few things you need to change:

* For the input data there must be a column with the name ``mint`` containing the mint hash/asset ID of the cNFT's.

* Change lines ``84 - 87`` to the proper headers in your input data.

* Do not remove the ``treeHeight`` or ``canopyDepth`` headers in these lines.