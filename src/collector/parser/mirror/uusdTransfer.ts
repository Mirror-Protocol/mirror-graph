import * as bluebird from 'bluebird'
import { TxInfo, TxLog } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { parseTransfer } from 'lib/terra'
import { accountService } from 'services'
import { AccountEntity, BalanceEntity } from 'orm'

export async function parse(manager: EntityManager, txInfo: TxInfo, log: TxLog): Promise<void> {
  const transfers = parseTransfer(log.events)
  if (!transfers || transfers.length < 1)
    return

  const accountRepo = manager.getRepository(AccountEntity)
  const balanceRepo = manager.getRepository(BalanceEntity)
  const datetime = new Date(txInfo.timestamp)

  await bluebird.mapSeries(transfers, async (transfer) => {
    const { from, to } = transfer

    const fromAccount = await accountRepo.findOne({
      select: ['address', 'isAppUser'], where: { address: transfer.from }
    })

    // only registered account
    if (fromAccount && fromAccount.isAppUser) {
      const uusdChange = transfer.denom === 'uusd' ? `-${transfer.amount}` : '0'

      if (uusdChange !== '0') {
        await accountService().addBalance(
          from, 'uusd', '1', uusdChange, datetime, balanceRepo
        )
      }
    }

    const toAccount = await accountRepo.findOne({
      select: ['address', 'isAppUser'], where: { address: transfer.to }
    })

    // only registered account
    if (toAccount && toAccount.isAppUser) {
      const uusdChange = transfer.denom === 'uusd' ? transfer.amount : '0'

      if (uusdChange !== '0') {
        await accountService().addBalance(
          to, 'uusd', '1', uusdChange, datetime, balanceRepo
        )
      }
    }
  })
}
