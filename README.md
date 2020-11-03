# Mirror Graph

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

## cli
### require process.env (.envrc sample)
```
export TERRA_LCD='<lcd url>'
export TERRA_MANTLE='<mantle url>
export TERRA_CHAIN_ID='<chain id>'

export CONTRACT_ID=-1

export KEYSTORE_PATH='./keystore-graph.json'
export KEYSTORE_OWNER_PASSWORD='<password>'
```
```
$ npm run cli
Usage: npm run cli [options] [command]

Options:
  -V, --version      output the version number
  -h, --help         display help for command

Commands:
  create [options]   create gov from json
  update-owner-key   update owner key
  update-bot-key     update bot key
  help [command]     display help for command
```

## Setup wallet keys using cli
```
$ npm run cli -- update-owner-key
$ npm run cli -- update-bot-key
```

## Run Collector
### require process.env (.envrc sample)
```
export TERRA_LCD='<lcd url>'
export TERRA_MANTLE='<mantle url>
export TERRA_CHAIN_ID='<chain id>'

export CONTRACT_ID=-1

export SENTRY_COLLECTOR='<sentry url for collector>'

export KEYSTORE_PATH='./keystore-graph.json'
export KEYSTORE_OWNER_PASSWORD='<password>'
```
### run
```
$ npm run collect
```

## Run Bot
### require process.env (.envrc sample)
```
export TERRA_LCD='<lcd url>'
export TERRA_MANTLE='<mantle url>
export TERRA_CHAIN_ID='<chain id>'

export CONTRACT_ID=-1

export SENTRY_BOT='<sentry url for bot>'

export KEYSTORE_PATH='./keystore-graph.json'
export KEYSTORE_BOT_PASSWORD='<password>'
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

export TERRA_LCD='<lcd url>'
export TERRA_MANTLE='<mantle url>
export TERRA_CHAIN_ID='<chain id>'

export CONTRACT_ID=-1

export SENTRY='<sentry url for graphql server>'

export IEX_CLOUD_API_KEY='<api key>'

export KEYSTORE_PATH='./keystore-graph.json'
export KEYSTORE_OWNER_PASSWORD='<password>'
export KEYSTORE_BOT_PASSWORD='<password>'
```
### run
```
$ npm run start
```
