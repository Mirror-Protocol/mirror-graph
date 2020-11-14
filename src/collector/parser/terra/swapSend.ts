import * as bluebird from 'bluebird'
import { TxInfo, TxLog, MsgSwapSend } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { findAttributes, findAttribute } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { govService, txService, accountService } from 'services'
import { TxType } from 'types'
import { AccountEntity, BalanceEntity } from 'orm'

export async function parse(
  manager: EntityManager, txInfo: TxInfo, msg: MsgSwapSend, log: TxLog
): Promise<void> {
  const attributes = findAttributes(log.events, 'swap')
  const trader = findAttribute(attributes, 'trader')
  const recipient = findAttribute(attributes, 'recipient')
  const accountRepo = manager.getRepository(AccountEntity)

  const fromAccount = await accountRepo.findOne({
    select: ['address', 'isAppUser'], where: { address: trader }
  })

  const toAccount = await accountRepo.findOne({
    select: ['address', 'isAppUser'], where: { address: recipient }
  })

  // only registered account
  if (!fromAccount && !toAccount)
    return

  const balanceRepo = manager.getRepository(BalanceEntity)
  const datetime = new Date(txInfo.timestamp)
  const tx = {
    height: txInfo.height,
    txHash: txInfo.txhash,
    datetime,
    govId: govService().get().id,
    memo: txInfo.tx.memo,
  }

  const offer = findAttribute(attributes, 'offer')
  const swapCoin = findAttribute(attributes, 'swap_coin')
  const swapFee = findAttribute(attributes, 'swap_fee')
  const fee = txInfo.tx.fee.amount.toString()
  const offerTokenAmount = splitTokenAmount(offer)
  const swapTokenAmount = splitTokenAmount(swapCoin)

  if (fromAccount) {
    let uusdChange = offerTokenAmount.token === 'uusd' ? `-${offerTokenAmount.amount}` : '0'

    // calculate fee
    const feeCoins = txInfo.tx.fee?.amount?.toArray()
    Array.isArray(feeCoins) && await bluebird.mapSeries(feeCoins, async (coin) => {
      if (coin.denom === 'uusd') {
        uusdChange = num(uusdChange).minus(coin.amount.toString()).toString()
      }
    })

    await txService().newTx({
      ...tx,
      type: TxType.TERRA_SWAP_SEND,
      address: trader,
      data: { trader, recipient, offer, swapCoin, swapFee },
      uusdChange,
      fee,
    }, manager)

    // if uusd token and app user, record balance history
    if (fromAccount.isAppUser && uusdChange !== '0') {
      await accountService().addBalance(
        trader, 'uusd', '1', uusdChange, datetime, balanceRepo
      )
    }
  }

  if (toAccount) {
    const uusdChange = swapTokenAmount.token === 'uusd' ? swapTokenAmount.amount : '0'

    await txService().newTx({
      ...tx,
      type: TxType.TERRA_RECEIVE,
      address: recipient,
      data: { recipient, sender: trader, amount: swapCoin },
      tags: [offerTokenAmount.token, swapTokenAmount.token],
      uusdChange,
    }, manager)

    // if uusd token and app user, record balance history
    if (toAccount.isAppUser && uusdChange !== '0') {
      await accountService().addBalance(
        recipient, 'uusd', '1', uusdChange, datetime, balanceRepo
      )
    }
  }
}
