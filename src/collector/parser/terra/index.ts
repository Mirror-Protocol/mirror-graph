import * as bluebird from 'bluebird'
import { TxInfo, TxLog, MsgSend, MsgMultiSend, MsgSwap, MsgSwapSend } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { parseTransfer } from 'lib/terra'
import { govService, txService } from 'services'
import { TxType } from 'types'
import { AccountEntity } from 'orm'

type AllowMsgs = MsgSend | MsgMultiSend | MsgSwap | MsgSwapSend

export async function parseTerraMsg(
  manager: EntityManager, txInfo: TxInfo, msg: AllowMsgs, log: TxLog
): Promise<void> {
  const accountRepo = manager.getRepository(AccountEntity)

  if (msg instanceof MsgSend) {
    const transfers = parseTransfer(log.events)

    await bluebird.mapSeries(transfers, async (transfer) => {
      // only tx exists address
      if (!(await accountRepo.findOne({
        select: ['address'], where: [{ address: transfer.from }, { address: transfer.to }]
      }))) {
        return
      }

      const tx = {
        height: txInfo.height,
        txHash: txInfo.txhash,
        datetime: new Date(txInfo.timestamp),
        govId: govService().get().id,
      }
      const { from, to } = transfer
      const data = transfer
      const fee = txInfo.tx.fee.amount.toString()

      await txService().newTx(manager, { ...tx, address: from, type: TxType.TERRA_SEND, data, fee })
      await txService().newTx(manager, { ...tx, address: to, type: TxType.TERRA_RECEIVE, data })
    })
  } else if (msg instanceof MsgSwap) {
    // only tx exists address
    if (!(await accountRepo.findOne({ select: ['address'], where: { address: msg.trader } }))) {
      return
    }

    await txService().newTx(manager, {
      height: txInfo.height,
      txHash: txInfo.txhash,
      datetime: new Date(txInfo.timestamp),
      fee: txInfo.tx.fee.amount.toString(),
      govId: govService().get().id,
      address: msg.trader,
      type: TxType.TERRA_SWAP,
      data: msg.toData(),
    })
  }
}
