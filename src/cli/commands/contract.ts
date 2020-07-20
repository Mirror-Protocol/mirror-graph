import { Container } from 'typedi'
import { MnemonicKey } from '@terra-money/terra.js'
import { program } from 'commander'
import { OwnerService } from 'services'
import * as logger from 'lib/logger'
import { storeCode } from 'lib/terra'

export function contract(): void {
  const ownerService = Container.get(OwnerService)

  program
    .command('store-code')
    .description('store contract code to chain and return codeId')
    .requiredOption('-m, --mnemonic <"mnemonic">', '24words mnemonic, must be separated by space')
    .option('--all', 'mint/oracle/token/market contracts')
    .option('--mint', 'mint contract')
    .option('--oracle', 'oracle contract')
    .option('--token', 'token contract')
    .option('--market', 'market contract')
    .action(async ({ mint, oracle, token, market, mnemonic, all }) => {
      const key = new MnemonicKey({ mnemonic })
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
    .requiredOption('--mint <codeId>', "mint contract's codeId", (value) => +value)
    .requiredOption('--oracle <codeId>', "oracle contract's codeId", (value) => +value)
    .requiredOption('--token <codeId>', "token contract's codeId", (value) => +value)
    .requiredOption('--market <codeId>', "market contract's codeId", (value) => +value)
    .requiredOption('-m, --mnemonic <"mnemonic">', '24words mnemonic, must be separated by space')
    .action(async ({ mint, oracle, token, market, mnemonic }) => {
      const contract = await ownerService.create(
        { mint, oracle, token, market },
        new MnemonicKey({ mnemonic })
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
