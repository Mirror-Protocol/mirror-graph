import { findAttributes, findAttribute } from 'lib/terra'
import { assetService, govService, accountService, priceService } from 'services'
import { TxEntity, AssetPositionsEntity, BalanceEntity, PriceEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract }: ParseArgs
): Promise<void> {
  const attributes = findAttributes(log.events, 'from_contract')
  const { govId } = contract
  const datetime = new Date(timestamp)
  let parsed = {}

  if (msg['bond'] || msg['unbond']) {
    const type = msg['bond'] ? TxType.STAKE : TxType.UNSTAKE
    const amount = findAttribute(attributes, 'amount')
    const assetToken = findAttribute(attributes, 'asset_token')
    const positionsRepo = manager.getRepository(AssetPositionsEntity)

    await assetService().addStakePosition(
      assetToken, type === TxType.STAKE ? amount : `-${amount}`, positionsRepo
    )

    const { mirrorToken } = govService().get()
    if (assetToken === mirrorToken) {
      if (type === TxType.STAKE) {
        await accountService().removeBalance(
          sender, mirrorToken, amount, datetime, manager.getRepository(BalanceEntity)
        )
      } else {
        const price = await priceService().getPrice(mirrorToken, datetime.getTime(), manager.getRepository(PriceEntity))

        await accountService().addBalance(
          sender, mirrorToken, price || '0', amount, datetime, manager.getRepository(BalanceEntity)
        )
      }
    }

    parsed = {
      type,
      data: { assetToken, amount },
      token: assetToken,
    }
  } else if (msg['withdraw']) {
    const amount = findAttribute(attributes, 'amount')

    const token = govService().get().mirrorToken
    const balanceRepo = manager.getRepository(BalanceEntity)
    const price = await priceService().getPrice(token, datetime.getTime(), manager.getRepository(PriceEntity))
    await accountService().addBalance(sender, token, price || '0', amount, datetime, balanceRepo)

    parsed = {
      type: TxType.WITHDRAW_REWARDS,
      data: { amount },
      token: govService().get().mirrorToken,
    }
  } else {
    return
  }

  const tx = new TxEntity({
    ...parsed, height, txHash, address: sender, datetime, govId, contract
  })
  await manager.save(tx)
}
