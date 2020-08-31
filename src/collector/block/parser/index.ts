import * as Bluebird from 'bluebird'
import { MsgExecuteContract, BlockInfo, TxInfo } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { getTxInfos } from '../blockInfo'
import { Parser } from './Parser'
import { MarketParser } from './MarketParser'
import { OracleParser } from './OracleParser'

const parsers: Parser[] = [new MarketParser(), new OracleParser()]

export async function parseTransactions(
  entityManager: EntityManager,
  blockInfo: BlockInfo
): Promise<void> {
  const txs: TxInfo[] = await getTxInfos(blockInfo)

  for (const txInfo of txs) {
    const msgs = txInfo.tx.msg.filter(
      (msg) => msg instanceof MsgExecuteContract
    ) as MsgExecuteContract[]

    await Bluebird.map(msgs, async (msg, index) => {
      for (const parser of parsers) {
        if (await parser.parse(entityManager, txInfo, msg, txInfo.logs[index])) {
          break
        }
      }
    })
  }
}
