import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { findAttributes, findAttribute } from 'lib/terra'
import { TxEntity, ContractEntity } from 'orm'
import { TxType } from 'types'

export async function parse(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity,
): Promise<void> {
  const { execute_msg: executeMsg } = msg
  let parsed = {}

  if (executeMsg['swap']) { // buy
    const attributes = findAttributes(log.events, 'from_contract')
    const offerAmount = findAttribute(attributes, 'offer_amount')

    parsed = {
      type: TxType.BUY,
      outValue: offerAmount,
      data: {
        offerAmount,
        returnAmount: findAttribute(attributes, 'return_amount'),
        taxAmount: findAttribute(attributes, 'tax_amount'),
        spreadAmount: findAttribute(attributes, 'spread_amount'),
        commissionAmount: findAttribute(attributes, 'commission_amount'),
      }
    }
  } else if (executeMsg['provide_liquidity']) {
    const attributes = findAttributes(log.events, 'from_contract')

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
  const { height, txhash: txHash, timestamp } = txInfo
  const { sender } = msg
  const datetime = new Date(timestamp)

  const tx = new TxEntity({
    ...parsed, height, txHash, sender, datetime, govId, assetId, contract
  })

  await manager.save(tx)
}
