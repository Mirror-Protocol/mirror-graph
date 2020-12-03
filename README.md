# Mirror Graph

**NOTE**: Notes on how to use are available [here](https://docs.mirror.finance/developer-tools/mirror-api).

The Mirror API (also known as Mirror Graph) is an GraphQL-based data service that allows anybody to query data regarding the current and aggregate application state of the Mirror Protocol. Potential consumers of data include: dashboards, mAsset arbitrage trading bots, dApp activity trackers, etc.

## Prerequisites
* Node.js v12
* TypeScript v3.8
* GraphQL v15
* PostgreSQL v12 (https://www.postgresql.org/download/)
* ormconfig.json on project root
* .envrc on project root
* address.json, assets.json, codeIds.json, contracts.json, description.json on project root/data

## Install dependencies
```
$ npm install
```

## require common process.env
```
export TERRA_LCD='<lcd url>'
export TERRA_MANTLE='<mantle url>
export TERRA_CHAIN_ID='<chain id>'

export KEYSTORE_PATH='./keystore-graph.json'

export SLACK_URL='<slack url>'
export SLACK_CHANNEL='<slack channel name>'
```

## cli
```
$ npm run cli
Usage: npm run cli [options] [command]

Options:
  -V, --version      output the version number
  -h, --help         display help for command

Commands:
  create [options]   create gov from json
  update-bot-key     update bot key
  help [command]     display help for command
```

## Setup wallet keys using cli
```
$ npm run cli -- update-bot-key
```

## Run Collector
### require process.env (.envrc sample)
```
export SENTRY_COLLECTOR='<sentry url for collector>'
export CONTRACT_ID=-1
export START_BLOCK_HEIGHT=0
```
### run
```
$ npm run collect
```

## Run Bot
### require process.env (.envrc sample)
```
export IEX_CLOUD_API_KEY='<api key>'
export SENTRY_BOT='<sentry url for bot>'
export KEYSTORE_BOT_PASSWORD='<password>'
export CONTRACT_ID=-1
```
### run
```
$ npm run bot
```

## Run Graph Server
### require process.env (.envrc sample)
```
export SERVER_PORT=3858
export ORM='default'

export SENTRY='<sentry url>'

export KEYSTORE_BOT_PASSWORD='<password>'

export CONTRACT_ID=-1
```
### run
```
$ npm run start
```
