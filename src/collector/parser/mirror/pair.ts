import { findAttributes, findAttribute } from 'lib/terra'
import { TxEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract }: ParseArgs
): Promise<void> {
  const attributes = findAttributes(log.events, 'from_contract')
  let parsed = {}

  if (msg['swap']) {
    const offerAsset = findAttribute(attributes, 'offer_asset')
    const askAsset = findAttribute(attributes, 'ask_asset')
    const offerAmount = findAttribute(attributes, 'offer_amount')
    const returnAmount = findAttribute(attributes, 'return_amount')

    parsed = {
      type: offerAsset === 'uusd' ? TxType.BUY : TxType.SELL,
      outValue: offerAsset === 'uusd' ? offerAmount : '0',
      inValue: askAsset === 'uusd' ? returnAmount : '0',
      data: {
        offerAsset,
        askAsset,
        offerAmount,
        returnAmount,
        taxAmount: findAttribute(attributes, 'tax_amount'),
        spreadAmount: findAttribute(attributes, 'spread_amount'),
        commissionAmount: findAttribute(attributes, 'commission_amount'),
      }
    }
  } else if (msg['provide_liquidity']) {
    parsed = {
      type: TxType.PROVIDE_LIQUIDITY,
      data: {
        assets: findAttribute(attributes, 'assets'),
        share: findAttribute(attributes, 'share'),
      }
    }
  } else {
    return
  }

  const { assetId, govId } = contract
  const datetime = new Date(timestamp)

  const tx = new TxEntity({
    ...parsed, height, txHash, sender, datetime, govId, assetId, contract
  })

  await manager.save(tx)
}
