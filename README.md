# Mirror Graph

## Prerequisites
* Node.js v12
* TypeScript v3.8
* GraphQL v15
* yarn (https://yarnpkg.com/)
* PostgreSQL v12 (https://www.postgresql.org/download/)
* ormconfig.json on project root
* .envrc on project root
* address.json, assets.json, codeIds.json, contracts.json on project root/data

## Install dependencies
```
$ yarn
```

## Setup process.env (.envrc sample)
```
export SERVER_PORT=1234
export ORM='default'
export TERRA_LCD='http://localhost:1317/'
export TERRA_CHAIN_ID='localterra'

export KEYSTORE_PATH='./keystore.json'
export CONTRACT_ID=-1
```

## cli
```
$ yarn cli
Usage: yarn cli [options] [command]

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
$ yarn cli update-owner-key
$ yarn cli update-bot-key
```

## Create Gov from json
```
$ yarn cli create -p <owner-key-password>
```

## Run Collector
```
$ yarn collect
```

## Run Bot
```
$ yarn bot -p <bot-key-password>
```

## Run Graph Server
```
$ yarn start
```
