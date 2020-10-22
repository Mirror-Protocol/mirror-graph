import * as bluebird from 'bluebird'
import { ContractActions, findAttributes, parseContractActions } from 'lib/terra'
import { num } from 'lib/num'
import { contractService, accountService, assetService, priceService } from 'services'
import { BalanceEntity, AssetEntity, PriceEntity, ContractEntity } from 'orm'
import { ContractType } from 'types'
import { ParseArgs } from './parseArgs'

async function getBuyPrice(
  token: string, contractActions: ContractActions, args: ParseArgs
): Promise<string> {
  const { manager, contract, timestamp, msg } = args

  // calculate buy price when buying
  if (contract.type === ContractType.PAIR &&
    msg['swap'] &&
    contractActions?.swap[0]?.offerAsset === 'uusd'
  ) {
    const { offerAmount, returnAmount } = contractActions.swap[0]

    return (offerAmount !== '0' && returnAmount !== '0')
      ? num(offerAmount).dividedBy(returnAmount).toString()
      : '0'
  }

  const priceEntity = manager.getRepository(PriceEntity)
  const datetime = new Date(timestamp)

  return (await priceService().getPrice(token, datetime.getTime(), priceEntity)) || '0'
}

export async function parse(args: ParseArgs): Promise<void> {
  const { manager, timestamp, log } = args
  const attributes = findAttributes(log.events, 'from_contract')
  if (!attributes) {
    return
  }

  const contractActions = parseContractActions(attributes)
  const contractRepo = manager.getRepository(ContractEntity)
  const balanceRepo = manager.getRepository(BalanceEntity)
  const assetRepo = manager.getRepository(AssetEntity)
  const datetime = new Date(timestamp)

  const transfers = []
  Array.isArray(contractActions.send) && transfers.push(...contractActions.send)
  Array.isArray(contractActions.transfer) && transfers.push(...contractActions.transfer)
  Array.isArray(contractActions.transferFrom) && transfers.push(...contractActions.transferFrom)
  Array.isArray(contractActions.sendFrom) && transfers.push(...contractActions.sendFrom)

  await bluebird.mapSeries(
    transfers,
    async (action) => {
      const { contract: token, from, to, amount } = action

      if (await assetService().get({ token }, undefined, assetRepo) &&
        !(await contractService().get({ address: to }, undefined, contractRepo))
      ) {
        const price = await getBuyPrice(token, contractActions, args)
        await accountService().addBalance(to, token, price || '0', amount, datetime, balanceRepo)
      }

      await accountService().removeBalance(from, token, amount, datetime, balanceRepo)
    }
  )
}
