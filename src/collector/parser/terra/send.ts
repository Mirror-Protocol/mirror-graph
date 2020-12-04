import * as bluebird from 'bluebird'
import { TxInfo, TxLog } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { parseTransfer } from 'lib/terra'
import { num } from 'lib/num'
import { govService, txService, accountService } from 'services'
import { TxType } from 'types'
import { BalanceEntity } from 'orm'

export async function parse(manager: EntityManager, txInfo: TxInfo, log: TxLog): Promise<void> {
  const transfers = parseTransfer(log.events)
  if (!transfers || transfers.length < 1)
    return

  const balanceRepo = manager.getRepository(BalanceEntity)
  const datetime = new Date(txInfo.timestamp)
  const tx = {
    height: txInfo.height,
    txHash: txInfo.txhash,
    datetime,
    govId: govService().get().id,
  }

  await bluebird.mapSeries(transfers, async (transfer) => {
    const { from, to } = transfer
    const data = transfer
    const tags = [transfer.denom]

    const fromAccount = await accountService().get({ address: transfer.from })

    // only registered account
    if (fromAccount) {
      const fee = txInfo.tx.fee.amount.toString()
      let uusdChange = transfer.denom === 'uusd' ? `-${transfer.amount}` : '0'

      // calculate fee
      const feeCoins = txInfo.tx.fee?.amount?.toArray()
      Array.isArray(feeCoins) && await bluebird.mapSeries(feeCoins, async (coin) => {
        if (coin.denom === 'uusd') {
          uusdChange = num(uusdChange).minus(coin.amount.toString()).toString()
        }
      })

      await txService().newTx({
        ...tx, type: TxType.TERRA_SEND, address: from, data, uusdChange, tags, fee
      }, manager)

      // if uusd token and app user, record balance history
      if (fromAccount.isAppUser && uusdChange !== '0') {
        await accountService().addBalance(
          from, 'uusd', '1', uusdChange, datetime, balanceRepo
        )
      }
    }

    const toAccount = await accountService().get({ address: transfer.to })

    // only registered account
    if (toAccount) {
      const uusdChange = transfer.denom === 'uusd' ? transfer.amount : '0'

      await txService().newTx({
        ...tx, type: TxType.TERRA_RECEIVE, address: to, data, uusdChange, tags
      }, manager)

      // if uusd token and app user, record balance history
      if (toAccount.isAppUser && uusdChange !== '0') {
        await accountService().addBalance(
          to, 'uusd', '1', uusdChange, datetime, balanceRepo
        )
      }
    }
  })
}
