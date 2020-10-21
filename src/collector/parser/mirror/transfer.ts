import * as bluebird from 'bluebird'
import { findAttributes, parseContractActions } from 'lib/terra'
import { contractService, accountService, assetService, priceService } from 'services'
import { BalanceEntity, AssetEntity, PriceEntity, ContractEntity } from 'orm'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, timestamp, log }: ParseArgs
): Promise<void> {
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

  await bluebird.mapSeries(
    transfers,
    async (action) => {
      const { contract: token, from, to, amount } = action

      if (await assetService().get({ token }, undefined, assetRepo) &&
        !(await contractService().get({ address: to }, undefined, contractRepo))
      ) {
        const price = await priceService().getPrice(token, datetime.getTime(), manager.getRepository(PriceEntity))
        await accountService().addBalance(to, token, price || '0', amount, datetime, balanceRepo)
      }
      await accountService().removeBalance(from, token, amount, datetime, balanceRepo)
    }
  )
}
