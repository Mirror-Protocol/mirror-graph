import { Container } from 'typedi'
import { program } from 'commander'
import { GovService, WhitelistingService } from 'services'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import { getKey } from 'lib/keystore'
import config from 'config'

export function contract(): void {
  const govService = Container.get(GovService)
  const whitelistingService = Container.get(WhitelistingService)

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
        const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
        const codeIds = {
          collector:
            (collector || all) && (await wallet.storeCode('src/contracts/mirror_collector.wasm')),
          factory:
            (factory || all) && (await wallet.storeCode('src/contracts/mirror_factory.wasm')),
          gov: (gov || all) && (await wallet.storeCode('src/contracts/mirror_gov.wasm')),
          market: (market || all) && (await wallet.storeCode('src/contracts/mirror_market.wasm')),
          mint: (mint || all) && (await wallet.storeCode('src/contracts/mirror_mint.wasm')),
          oracle: (oracle || all) && (await wallet.storeCode('src/contracts/mirror_oracle.wasm')),
          staking:
            (staking || all) && (await wallet.storeCode('src/contracts/mirror_staking.wasm')),
          token: (token || all) && (await wallet.storeCode('src/contracts/mirror_token.wasm')),
        }
        logger.info(codeIds)
      }
    )

  program
    .command('create')
    .description('create gov')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async ({ password }) => {
      const codeIds = {
        collector: 59,
        factory: 42,
        gov: 60,
        market: 61,
        mint: 45,
        oracle: 46,
        staking: 47,
        token: 48,
      }
      const gov = await govService.create(
        codeIds,
        getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)
      )

      await govService.load(-1)
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
      await whitelistingService.create(wallet, codeIds)

      logger.info(`created mirror gov. id: ${gov.id}`)
    })
}
