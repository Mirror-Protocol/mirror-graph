import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { findAttributes, findAttribute } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { AssetService, CdpService } from 'services'
import { ContractEntity, AssetEntity, TxEntity, CdpEntity } from 'orm'
import { TxType } from 'types'

export async function parseCdp(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
): Promise<void> {
  const { execute_msg: executeMsg } = msg
  const { govId } = contract
  const { height, txhash: txHash, timestamp } = txInfo
  const { sender } = msg
  const datetime = new Date(timestamp)

  const attributes = findAttributes(log.events, 'from_contract')
  const positionIdx = findAttribute(attributes, 'position_idx')

  let tx = {}
  let cdp

  if (executeMsg['open_position']) {
    const mintAmount = findAttribute(attributes, 'mint_amount')
    const collateralAmount = findAttribute(attributes, 'collateral_amount')

    const minted = splitTokenAmount(mintAmount)
    const collateral = splitTokenAmount(collateralAmount)
    const asset = await Container.get(AssetService)
      .get({ token: minted.token }, manager.getRepository(AssetEntity))
    const assetId = asset.id

    cdp = new CdpEntity({
      idx: positionIdx,
      mintedAmount: minted.amount,
      collateralToken: collateral.token,
      collateralAmount: collateral.amount,
      govId,
      assetId,
    })

    tx = {
      type: TxType.OPEN_POSITION,
      data: { positionIdx, mintAmount, collateralAmount },
      outValue: collateral.amount,
      assetId,
    }
  } else if (executeMsg['deposit']) {
    cdp = Container.get(CdpService).get({ idx: positionIdx })
    const depositAmount = findAttribute(attributes, 'deposit_amount')
    const outValue = splitTokenAmount(depositAmount).amount

    tx = {
      type: TxType.DEPOSIT_COLLATERAL,
      data: { positionIdx, depositAmount },
      outValue,
    }
  } else if (executeMsg['withdraw']) {
    cdp = Container.get(CdpService).get({ idx: positionIdx })
    const withdrawAmount = findAttribute(attributes, 'withdraw_amount')
    const inValue = splitTokenAmount(withdrawAmount).amount

    tx = {
      type: TxType.WITHDRAW_COLLATERAL,
      data: {
        positionIdx,
        withdrawAmount,
        taxAmount: findAttribute(attributes, 'tax_amount'),
      },
      inValue,
    }
  }

  const txEntity = new TxEntity({
    ...tx, height, txHash, sender, datetime, govId, contract
  })
  await manager.save([cdp, txEntity])
}

export async function parse(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
): Promise<void> {
  const { execute_msg: executeMsg } = msg
  if (
    executeMsg['open_position'] || executeMsg['deposit'] || executeMsg['withdraw']
  ) {
    parseCdp(manager, txInfo, msg, log, contract)
  }
}