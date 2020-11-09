import * as bluebird from 'bluebird'
import { TxInfo, TxLog, MsgSend, MsgSwap, MsgSwapSend } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { parseTransfer, findAttributes, findAttribute } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { govService, txService } from 'services'
import { TxType } from 'types'
import { AccountEntity } from 'orm'

type AllowMsgs = MsgSend | MsgSwap | MsgSwapSend

export async function parseTerraMsg(
  manager: EntityManager, txInfo: TxInfo, msg: AllowMsgs, log: TxLog
): Promise<void> {
  const accountRepo = manager.getRepository(AccountEntity)
  const tx = {
    height: txInfo.height,
    txHash: txInfo.txhash,
    datetime: new Date(txInfo.timestamp),
    govId: govService().get().id,
    memo: txInfo.tx.memo,
  }

  if (msg instanceof MsgSend) {
    const transfers = parseTransfer(log.events)

    await bluebird.mapSeries(transfers, async (transfer) => {
      // only tx exists address
      const account = await accountRepo.findOne({
        select: ['address'],
        where: [{ address: transfer.from }, { address: transfer.to }]
      })

      if (!account)
        return

      const { from, to } = transfer
      const data = transfer
      const fee = txInfo.tx.fee.amount.toString()
      const tags = [transfer.denom]

      await txService().newTx(manager, {
        ...tx,
        type: TxType.TERRA_SEND,
        address: from,
        data,
        uusdChange: transfer.denom === 'uusd' ? `-${transfer.amount}` : '0',
        tags,
        fee,
      })
      await txService().newTx(manager, {
        ...tx,
        type: TxType.TERRA_RECEIVE,
        address: to,
        data,
        uusdChange: transfer.denom === 'uusd' ? transfer.amount : '0',
        tags,
      })
    })
  } else if (msg instanceof MsgSwap) {
    // only tx exists address
    const account = await accountRepo.findOne({
      select: ['address'], where: { address: msg.trader }
    })

    if (!account)
      return

    const attributes = findAttributes(log.events, 'swap')
    const offer = findAttribute(attributes, 'offer')
    const swapCoin = findAttribute(attributes, 'swap_coin')

    const offerTokenAmount = splitTokenAmount(offer)
    const swapTokenAmount = splitTokenAmount(swapCoin)

    let uusdChange = '0'
    if (offerTokenAmount.token === 'uusd') uusdChange = `-${offerTokenAmount.amount}`
    else if(swapTokenAmount.token === 'uusd') uusdChange = swapTokenAmount.amount

    await txService().newTx(manager, {
      ...tx,
      type: TxType.TERRA_SWAP,
      address: msg.trader,
      data: {
        offer,
        trader: findAttribute(attributes, 'trader'),
        recipient: findAttribute(attributes, 'recipient'),
        swapCoin,
        swapFee: findAttribute(attributes, 'swap_fee'),
      },
      uusdChange,
      fee: txInfo.tx.fee.amount.toString(),
      tags: [offerTokenAmount.token, swapTokenAmount.token],
    })
  } else if (msg instanceof MsgSwapSend) {
    const attributes = findAttributes(log.events, 'swap')
    const trader = findAttribute(attributes, 'trader')
    const recipient = findAttribute(attributes, 'recipient')

    // only tx exists address
    const account = await accountRepo.findOne({
      select: ['address'],
      where: [{ address: trader }, { address: recipient }]
    })

    if (!account)
      return

    const offer = findAttribute(attributes, 'offer')
    const swapCoin = findAttribute(attributes, 'swap_coin')
    const swapFee = findAttribute(attributes, 'swap_fee')
    const fee = txInfo.tx.fee.amount.toString()
    const offerTokenAmount = splitTokenAmount(offer)
    const swapTokenAmount = splitTokenAmount(swapCoin)

    await txService().newTx(manager, {
      ...tx,
      type: TxType.TERRA_SWAP_SEND,
      address: trader,
      data: { trader, recipient, offer, swapCoin, swapFee },
      uusdChange: offerTokenAmount.token === 'uusd' ? `-${offerTokenAmount.amount}` : '0',
      fee,
    })

    await txService().newTx(manager, {
      ...tx,
      type: TxType.TERRA_RECEIVE,
      address: recipient,
      data: { recipient, sender: trader, amount: swapCoin },
      tags: [offerTokenAmount.token, swapTokenAmount.token],
      uusdChange: swapTokenAmount.token === 'uusd' ? swapTokenAmount.amount : '0',
    })
  }
}
