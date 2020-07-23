import { Container } from 'typedi'
import { program } from 'commander'
import { OwnerService } from 'services'
import * as logger from 'lib/logger'
import { storeCode } from 'lib/terra'
import { getKey } from 'lib/keystore'
import config from 'config'

export function contract(): void {
  const ownerService = Container.get(OwnerService)

  program
    .command('store-code')
    .description('store contract code to chain and return codeId')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .option('--all', 'mint/oracle/token/market contracts')
    .option('--mint', 'mint contract')
    .option('--oracle', 'oracle contract')
    .option('--token', 'token contract')
    .option('--market', 'market contract')
    .action(async ({ password, mint, oracle, token, market, all }) => {
      const key = getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)
      const codeIds = {
        mint: (mint || all) && (await storeCode('src/contracts/mirror_mint.wasm', key)),
        oracle: (oracle || all) && (await storeCode('src/contracts/mirror_oracle.wasm', key)),
        token: (token || all) && (await storeCode('src/contracts/mirror_erc20.wasm', key)),
        market: (market || all) && (await storeCode('src/contracts/mirror_market.wasm', key)),
      }
      logger.info(codeIds)
    })

  program
    .command('create')
    .description('instantiate mint/market contracts')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .requiredOption('--mint <codeId>', "mint contract's codeId", (value) => +value)
    .requiredOption('--oracle <codeId>', "oracle contract's codeId", (value) => +value)
    .requiredOption('--token <codeId>', "token contract's codeId", (value) => +value)
    .requiredOption('--market <codeId>', "market contract's codeId", (value) => +value)
    .action(async ({ password, mint, oracle, token, market }) => {
      const contract = await ownerService.create(
        { mint, oracle, token, market },
        getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)
      )
      await ownerService.contractInfo()
      logger.info('created mirror contract', contract)
    })

  program
    .command('contract-info')
    .description('show mint/market contracts infomation')
    .action(async () => {
      await ownerService.contractInfo()
    })
}
