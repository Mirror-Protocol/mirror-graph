import * as fs from 'fs'
import { Container } from 'typedi'
import { program } from 'commander'
import { GovService } from 'services'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import { getKey } from 'lib/keystore'
import config from 'config'

export function contract(): void {
  const govService = Container.get(GovService)

  program
    .command('store-code')
    .description('store contract code to chain and return codeId')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .option('--all', 'mint/oracle/token/market contracts')
    .option('--collector', 'collector contract')
    .option('--factory', 'factory contract')
    .option('--gov', 'gov contract')
    .option('--market', 'market contract')
    .option('--mint', 'mint contract')
    .option('--oracle', 'oracle contract')
    .option('--staking', 'staking contract')
    .option('--token', 'token contract')
    .action(
      async ({ password, all, collector, factory, gov, market, mint, oracle, staking, token }) => {
        // eslint-disable-next-line
        let codeIds: any = {}
        try {
          codeIds = JSON.parse(fs.readFileSync('./codeIds.json', 'utf8') || '{}')
        } catch (error) {
          logger.info('there is no codeIds.json file')
        }

        const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))

        if (collector || all)
          codeIds.collector = await wallet.storeCode('src/contracts/mirror_collector.wasm')
        if (factory || all)
          codeIds.factory = await wallet.storeCode('src/contracts/mirror_factory.wasm')
        if (gov || all) codeIds.gov = await wallet.storeCode('src/contracts/mirror_gov.wasm')
        if (market || all)
          codeIds.market = await wallet.storeCode('src/contracts/mirror_market.wasm')
        if (mint || all) codeIds.mint = await wallet.storeCode('src/contracts/mirror_mint.wasm')
        if (oracle || all)
          codeIds.oracle = await wallet.storeCode('src/contracts/mirror_oracle.wasm')
        if (staking || all)
          codeIds.staking = await wallet.storeCode('src/contracts/mirror_staking.wasm')
        if (token || all) codeIds.token = await wallet.storeCode('src/contracts/mirror_token.wasm')

        logger.info(codeIds)
        fs.writeFileSync('./codeIds.json', JSON.stringify(codeIds))
      }
    )

  program
    .command('create')
    .description('create gov')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async ({ password }) => {
      const codeIds = JSON.parse(fs.readFileSync('./codeIds.json', 'utf8'))
      if (!codeIds) {
        throw new Error('not provided codeIds.json')
      }
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
      const gov = await govService.create(wallet, codeIds)
      logger.info(`created mirror gov. id: ${gov.id}`)
    })
}
