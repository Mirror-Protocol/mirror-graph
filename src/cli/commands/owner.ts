import { Container } from 'typedi'
import { program } from 'commander'
import { ContractService } from 'services'
import * as logger from 'lib/logger'
import { storeCode } from 'lib/terra'
import { getKey } from 'lib/keystore'
import config from 'config'

export function contract(): void {
  const contractService = Container.get(ContractService)

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
    .command('init')
    .description('initialize contract info')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .requiredOption('--mint <codeId>', 'mint contract codeId', (value) => +value)
    .requiredOption('--oracle <codeId>', 'oracle contract codeId', (value) => +value)
    .requiredOption('--token <codeId>', 'token contract codeId', (value) => +value)
    .requiredOption('--market <codeId>', 'market contract codeId', (value) => +value)
    .option('--mint-contract <address>', 'if undefined, make new instance')
    .option('--market-contract <address>', 'if undefined, make new instance')
    .action(async ({ password, mint, oracle, token, market, mintContract, marketContract }) => {
      const contract = await contractService.create(
        { mint, oracle, token, market },
        getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password),
        mintContract,
        marketContract
      )
      !mintContract && logger.info('mint', await contractService.getMintContractInfo())
      !marketContract && logger.info('market', await contractService.getMarketContractInfo())
      logger.info(`created mirror contract. id: ${contract.id}`, contract)
    })

  program
    .command('mint-contract-info')
    .description('show mint contract infomation')
    .action(async () => {
      logger.info(await contractService.getMintContractInfo())
    })

  program
    .command('market-contract-info')
    .description('show market contract infomation')
    .action(async () => {
      logger.info(await contractService.getMarketContractInfo())
    })
}

export function configuration(): void {
  const contractService = Container.get(ContractService)

  program
    .command('config-mint')
    .description('modify configuration of mint contract')
    .option('-p, --password <owner-password>', 'owner key password')
    .option('--collateral-denom <denom>', 'collateral denom, uses mint')
    .option('--deposit-denom <denom>', 'deposit denom')
    .option('--whitelist-threshold <threshold>', 'whitelist threshold')
    .option('--auction-discount <discount-rate>', 'auction discount rate')
    .option('--auction-threshold-rate <threshold-rate>', 'auction start threshold rate')
    .option('--mint-capacity <capacity>', 'mint capacity rate')
    .option('--owner <owner>', 'owner')
    .action(
      async ({
        password,
        collateralDenom,
        depositDenom,
        whitelistThreshold,
        auctionDiscount,
        auctionThresholdRate,
        mintCapacity,
        owner,
      }) => {
        if (password) {
          await contractService.configMint(
            {
              collateralDenom,
              depositDenom,
              whitelistThreshold,
              auctionDiscount,
              auctionThresholdRate,
              mintCapacity,
              owner,
            },
            getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)
          )
        }

        logger.info(await contractService.getMintConfig())
      }
    )

  program
    .command('config-market-pool <symbol>')
    .description('print whitelisted information')
    .option('-p, --password <owner-password>', 'owner key password')
    .option('--base-pool <pool>', 'base pool')
    .option('--commission-rate <commission-rate>', 'commission rate')
    .option('--min-spread <min-spread>', 'min spread')
    .option('--max-spread <max-spread>', 'max spread')
    .option('--margin-threshold-rate <threshold>', 'margin threshold rate')
    .option('--margin-discount-rate <discount-rate>', 'margin discount rate')
    .action(
      async (
        symbol,
        {
          password,
          basePool,
          commissionRate,
          minSpread,
          maxSpread,
          marginThresholdRate,
          marginDiscountRate,
        }
      ) => {
        if (password) {
          await contractService.configMarketPool(
            {
              symbol,
              basePool,
              commissionRate,
              minSpread,
              maxSpread,
              marginThresholdRate,
              marginDiscountRate,
            },
            getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password)
          )
        }

        logger.info(await contractService.getMarketConfig())
      }
    )
}
