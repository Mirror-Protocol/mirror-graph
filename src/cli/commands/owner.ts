import * as fs from 'fs'
import * as bluebird from 'bluebird'
import { Msg, MsgMigrateContract } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { GovService, AssetService, ContractService } from 'services'
import { CodeIds, ContractType } from 'types'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import { getKey } from 'lib/keystore'
import config from 'config'
import { loadCodeIds } from './utils'

export function ownerCommands(): void {
  const govService = Container.get(GovService)
  const assetService = Container.get(AssetService)
  const contractService = Container.get(ContractService)

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
        const codeIds: Partial<CodeIds> = loadCodeIds() || {}

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

        fs.writeFileSync('./codeIds.json', JSON.stringify(codeIds))
        logger.info('stored', codeIds)
      }
    )

  program
    .command('create')
    .description('create gov and instantiate needed contracts')
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async ({ password }) => {
      const codeIds = loadCodeIds()
      if (!codeIds) {
        logger.error('not provided codeIds.json')
        return
      }

      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
      const gov = await govService.create(wallet, codeIds)
      logger.info(`created mirror gov. id: ${gov.id}`)
    })

  program
    .command('migrate <gov-id> <contract-type>')
    .description(
      `migrate contract of <gov-id>. contract is one of [collector, factory, gov, market, mint, oracle, staking, token]`
    )
    .requiredOption('-p, --password <owner-password>', 'owner key password')
    .action(async (govId, contract: string, { password }) => {
      const codeIds = loadCodeIds()
      if (!codeIds) {
        logger.error('not provided codeIds.json')
        return
      }
      const gov = await govService.load(govId)
      if (!gov) {
        logger.error('invalid govId')
        return
      }

      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, password))
      const owner = wallet.key.accAddress
      const msgs: Msg[] = []

      switch (contract) {
        case 'collector':
        case 'factory':
        case 'gov':
          msgs.push(
            new MsgMigrateContract(
              owner,
              (
                await contractService.get({ gov, type: ContractType[contract.toUpperCase()] })
              ).address,
              codeIds[contract],
              {}
            )
          )
          gov.codeIds[contract] = codeIds[contract]
          break

        case 'token': {
          await bluebird.map(assetService.getAll(), async (asset) => {
            const tokenContract = await contractService.get({ asset, type: ContractType.TOKEN })
            const lpTokenContract = await contractService.get({
              asset,
              type: ContractType.LP_TOKEN,
            })

            msgs.push(new MsgMigrateContract(owner, tokenContract.address, codeIds.token, {}))
            msgs.push(new MsgMigrateContract(owner, lpTokenContract.address, codeIds.token, {}))
          })

          const mirrorTokenContract = await contractService.get({
            gov,
            type: ContractType.MIRROR_TOKEN,
          })
          msgs.push(new MsgMigrateContract(owner, mirrorTokenContract.address, codeIds.token, {}))

          gov.codeIds.token = codeIds.token
          break
        }

        case 'mint':
        case 'market':
        case 'staking':
        case 'oracle':
          await bluebird.map(assetService.getAll(), async (asset) => {
            const contractEntity = await contractService.get({
              asset,
              type: ContractType[contract.toUpperCase()],
            })
            contractEntity &&
              msgs.push(
                new MsgMigrateContract(owner, contractEntity.address, codeIds[contract], {})
              )
          })

          gov.codeIds[contract] = codeIds[contract]
          break

        default:
          logger.error(`invalid contract`)
          return
      }

      if (msgs.length > 0) {
        await wallet.executeMsgs(msgs)
        govService.save(gov)
      }

      logger.info(`${msgs.length} contracts migrated`)
    })
}
