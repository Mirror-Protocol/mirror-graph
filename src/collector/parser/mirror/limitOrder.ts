import { findAttributes, findAttribute } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { txService } from 'services'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract, fee }: ParseArgs
): Promise<void> {
  const { govId } = contract
  const datetime = new Date(timestamp)
  let parsed = {}

  if (msg['submit_order']) {
    const attributes = findAttributes(log.events, 'from_contract', { key: 'action', value: 'submit_order' })
    const orderId = findAttribute(attributes, 'order_id')
    const bidderAddr = findAttribute(attributes, 'bidder_addr')
    const offerAsset = findAttribute(attributes, 'offer_asset')
    const askAsset = findAttribute(attributes, 'ask_asset')

    const offer = splitTokenAmount(offerAsset)
    const ask = splitTokenAmount(askAsset)
    if (offer.amount === '0' || ask.amount === '0') {
      return
    }

    const type = offer.token === 'uusd' ? TxType.BUY_LIMIT_ORDER : TxType.SELL_LIMIT_ORDER
    const orderPrice = type === TxType.BUY_LIMIT_ORDER
      ? num(offer.amount).dividedBy(ask.amount).toString()
      : num(ask.amount).dividedBy(offer.amount).toString()
    const token = type === TxType.BUY_LIMIT_ORDER
      ? ask.token
      : offer.token

    parsed = {
      type,
      token,
      data: {
        orderId,
        bidderAddr,
        offerAsset,
        askAsset,
        orderPrice,
      },
      tags: [offer.token, ask.token]
    }
  } else if (msg['cancel_order']) {
    const attributes = findAttributes(log.events, 'from_contract', { key: 'action', value: 'cancel_order' })
    const orderId = findAttribute(attributes, 'order_id')

    parsed = {
      type: TxType.CANCEL_LIMIT_ORDER,
      // token,
      data: {
        orderId,
      },
      // tags: [offer.token, ask.token]
    }
  } else {
    return
  }

  await txService().newTx({
    ...parsed, height, txHash, address: sender, datetime, govId, contract, fee
  }, manager)
}
