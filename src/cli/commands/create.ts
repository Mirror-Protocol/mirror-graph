import { Container } from 'typedi'
import { program } from 'commander'
import { ContractService, GovService } from 'services'
import * as logger from 'lib/logger'
import { storeCode, lcd } from 'lib/terra'
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
        const wallet = lcd.wallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
        const codeIds = {
          collector:
            (collector || all) && (await storeCode('src/contracts/mirror_collector.wasm', wallet)),
          factory:
            (factory || all) && (await storeCode('src/contracts/mirror_factory.wasm', wallet)),
          gov: (gov || all) && (await storeCode('src/contracts/mirror_gov.wasm', wallet)),
          market: (market || all) && (await storeCode('src/contracts/mirror_market.wasm', wallet)),
          mint: (mint || all) && (await storeCode('src/contracts/mirror_mint.wasm', wallet)),
          oracle: (oracle || all) && (await storeCode('src/contracts/mirror_oracle.wasm', wallet)),
          staking:
            (staking || all) && (await storeCode('src/contracts/mirror_staking.wasm', wallet)),
          token: (token || all) && (await storeCode('src/contracts/mirror_token.wasm', wallet)),
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
        collector: 25,
        factory: 26,
        gov: 27,
        market: 28,
        mint: 29,
        oracle: 30,
        staking: 31,
        token: 32,
      }
      const contract = await contractService.create(
        codeIds,
        getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)
      )
      logger.info(`created mirror contract. id: ${contract.id}`)

      await contractService.load(-1)
      const wallet = lcd.wallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
      await govService.create(wallet)
      logger.info(`created mirror gov`)
    })
}
