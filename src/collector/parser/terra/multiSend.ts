import * as bluebird from 'bluebird'
import { TxInfo, TxLog, Coin } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { findAttributes } from 'lib/terra'
import { govService, txService, accountService } from 'services'
import { TxType } from 'types'
import { BalanceEntity } from 'orm'

export async function parse(manager: EntityManager, txInfo: TxInfo, log: TxLog): Promise<void> {
  const attributes = findAttributes(log.events, 'transfer')
  if (!attributes) {
    return
  }

  const transfers = []

  for (let i = 0; i < attributes.length / 2; i ++) {
    const to = attributes[i * 2].value
    const coin = Coin.fromString(attributes[i * 2 + 1].value)
    const { denom, amount } = coin.toData()

    transfers.push({ to, denom, amount })
  }

  if (!transfers || transfers.length < 1)
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

  await bluebird.mapSeries(transfers, async (transfer) => {
    const { to } = transfer
    const data = transfer
    const tags = [transfer.denom]

    const toAccount = await accountService().get({ address: transfer.to })

    // only registered account
    if (!toAccount) 
      return

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
  })
}
