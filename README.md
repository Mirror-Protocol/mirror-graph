# Mirror API

**NOTE**: Notes on how to use are available [here](https://docs.mirror.finance/developer-tools/mirror-api).

The Mirror API (also known as Mirror Graph) is an GraphQL-based data service that allows anybody to query data regarding the current and aggregate application state of the Mirror Protocol. Potential consumers of data include: dashboards, mAsset arbitrage trading bots, dApp activity trackers, etc.

## Endpoints

You can access the Mirror API through the endpoints shown below:

| | Chain ID | URL |
| - | - | - |
| Mainnet | `columbus-4` | https://graph.mirror.finance/graphql |
| Testnet | `tequila-0004` | https://tequila-graph.mirror.finance/graphql |

## Running Mirror API Locally

**NOTE**: This is only if you want to run a local instance of Mirror API. In most cases, you will want to use the public [endpoints][#endpoints].


### Requirements

* Node.js v12
* TypeScript v3.8
* GraphQL v15
* PostgreSQL v12 (https://www.postgresql.org/download/)
* ormconfig.json on project root
* .envrc on project root
* address.json, assets.json, codeIds.json, contracts.json, description.json on project root/data

### Instructions

1. Install dependencies

```bash
$ npm install
```

2. Require common process.env

```bash
export TERRA_LCD='<lcd url>'
export TERRA_MANTLE='<mantle url>
export TERRA_CHAIN_ID='<chain id>'

export KEYSTORE_PATH='./keystore-graph.json'

export SLACK_URL='<slack url>'
export SLACK_CHANNEL='<slack channel name>'
```

3. Setup wallet keys using cli

```bash
$ npm run cli -- update-bot-key
```

4. Run Collector

**require process.env (.envrc sample)**

```bash
export SENTRY_COLLECTOR='<sentry url for collector>'
export CONTRACT_ID=-1
export START_BLOCK_HEIGHT=0
```

**run**

```bash
$ npm run collect
```

5. Run Bot

**require process.env (.envrc sample)**
```bash
export IEX_CLOUD_API_KEY='<api key>'
export SENTRY_BOT='<sentry url for bot>'
export KEYSTORE_BOT_PASSWORD='<password>'
export CONTRACT_ID=-1
```

**run**
```bash
$ npm run bot
```

6. Run Graph Server

**require process.env (.envrc sample)**

```bash
export SERVER_PORT=3858
export ORM='default'

export SENTRY='<sentry url>'

export KEYSTORE_BOT_PASSWORD='<password>'

export CONTRACT_ID=-1
```

**run** (finally)

```bash
$ npm run start
```

## License

Copyright 2020 Mirror Protocol

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0. Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and limitations under the License.

