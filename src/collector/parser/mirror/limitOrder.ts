import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { limitOrderService, statisticService, txService } from 'services'
import { LimitOrderEntity, DailyStatisticEntity } from 'orm'
import { TxType, LimitOrderType } from 'types'
import { ParseArgs } from './parseArgs'
import { errorHandler } from 'lib/error'

export async function parse(
  { manager, height, txHash, timestamp, sender, contract, contractEvent, fee }: ParseArgs
): Promise<void> {
  const limitOrderRepo = manager.getRepository(LimitOrderEntity)
  const { govId } = contract
  const datetime = new Date(timestamp)
  let parsed = {}

  const actionType = contractEvent.action?.actionType
  if (!actionType) {
    return
  }

  if (actionType === 'submit_order') {
    const { orderId, bidderAddr, offerAsset, askAsset } = contractEvent.action

    const offer = splitTokenAmount(offerAsset)
    const ask = splitTokenAmount(askAsset)
    if (offer.amount === '0' || ask.amount === '0') {
      return
    }

    const txType = offer.token === 'uusd' ? TxType.BID_LIMIT_ORDER : TxType.ASK_LIMIT_ORDER
    let type, price, token, amount, uusdAmount

    if (txType === TxType.BID_LIMIT_ORDER) {
      type = LimitOrderType.BID
      token = ask.token
      amount = ask.amount
      uusdAmount = offer.amount
      price = num(offer.amount).dividedBy(ask.amount).toString()
    } else {
      type = LimitOrderType.ASK
      token = offer.token
      amount = offer.amount
      uusdAmount = ask.amount
      price = num(ask.amount).dividedBy(offer.amount).toString()
    }

    // save limit order entity
    await manager.save(new LimitOrderEntity({
      id: orderId, address: bidderAddr, token, type, price, amount, uusdAmount,
    }))

    parsed = {
      type: txType,
      token,
      data: {
        orderId,
        bidderAddr,
        offerAsset,
        askAsset,
        type,
        amount,
        uusdAmount,
      },
      tags: [offer.token, ask.token]
    }
  } else if (actionType === 'cancel_order') {
    const { orderId } = contractEvent.action

    const limitOrder = await limitOrderService().get({ id: orderId }, undefined, limitOrderRepo)
    if (!limitOrder) {
      errorHandler(new Error(`invalid limit order id [${orderId}] from cancel_order`))
      return
    }
    const { token, type, amount, uusdAmount, filledAmount, filledUusdAmount } = limitOrder

    // remove limit order entity
    await limitOrderRepo.remove(limitOrder)

    parsed = {
      type: TxType.CANCEL_LIMIT_ORDER,
      token,
      data: {
        orderId,
        type,
        amount,
        uusdAmount,
        filledAmount,
        filledUusdAmount,
      },
      tags: [token, 'uusd']
    }
  } else if (actionType === 'execute_order') {
    const { orderId, executorReceive, bidderReceive } = contractEvent.action

    const limitOrder = await limitOrderService().get({ id: orderId }, undefined, limitOrderRepo)
    if (!limitOrder) {
      errorHandler(new Error(`invalid limit order id [${orderId}] from execute_order`))
      return
    }

    const { token, type, address } = limitOrder
    const filled = splitTokenAmount(type === LimitOrderType.ASK ? executorReceive : bidderReceive)
    const filledUusd = splitTokenAmount(type === LimitOrderType.ASK ? bidderReceive : executorReceive)

    limitOrder.filledAmount = num(limitOrder.filledAmount).plus(filled.amount).toFixed(0)
    limitOrder.filledUusdAmount = num(limitOrder.filledUusdAmount).plus(filledUusd.amount).toFixed(0)

    if (num(limitOrder.filledAmount).isGreaterThanOrEqualTo(limitOrder.amount) ||
      num(limitOrder.filledUusdAmount).isGreaterThanOrEqualTo(limitOrder.uusdAmount) ||
      num(limitOrder.uusdAmount).minus(limitOrder.filledUusdAmount).isLessThan(1000000)) {
      // remove limit order entity
      await limitOrderRepo.remove(limitOrder)
    } else {
      // save limit order entity
      await manager.save(limitOrder)
    }

    // add daily trading volume
    await statisticService().addDailyTradingVolume(
      datetime.getTime(), filledUusd.amount, manager.getRepository(DailyStatisticEntity)
    )

    parsed = {
      type: TxType.EXECUTE_LIMIT_ORDER,
      token,
      data: {
        orderId,
        type,
        executorReceive,
        bidderReceive,
        filledAmount: filled.amount,
        filledUusdAmount: filledUusd.amount,
      },
      volume: filledUusd.amount,
      tags: [token, 'uusd']
    }

    // save order owner's tx
    await txService().newTx({
      ...parsed, height, txHash, address, datetime, govId, contract, fee
    }, manager)
  } else {
    return
  }

  await txService().newTx({
    ...parsed, height, txHash, address: sender, datetime, govId, contract, fee
  }, manager)
}
