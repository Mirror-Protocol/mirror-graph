import { Container } from 'typedi'
import { program } from 'commander'
import { ContractService, GovService } from 'services'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import { getKey } from 'lib/keystore'
import config from 'config'

export function contract(): void {
  const contractService = Container.get(ContractService)
  const govService = Container.get(GovService)

  program
    .command('store-code')
    .description('store contract code to chain and return codeId')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .option('--all', 'mint/oracle/token/market contracts')
    .option('--gov', 'gov contract')
    .option('--mint', 'mint contract')
    .option('--oracle', 'oracle contract')
    .option('--token', 'token(cw20) contract')
    .option('--market', 'market contract')
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
    .description('create contract')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async ({ password }) => {
      const codeIds = {
        collector: 41,
        factory: 42,
        gov: 43,
        market: 44,
        mint: 45,
        oracle: 46,
        staking: 47,
        token: 48,
      }
      const contract = await contractService.create(
        codeIds,
        getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)
      )
      logger.info(`created mirror contract. id: ${contract.id}`)

      await contractService.load(-1)
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
      await govService.create(wallet)
      logger.info(`created mirror gov`)
    })
}
