import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { findAttributes, findAttribute } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { AssetService, CdpService } from 'services'
import { ContractEntity, AssetEntity, TxEntity, CdpEntity } from 'orm'
import { TxType } from 'types'

export async function parseCdp(
  manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, log: TxLog, contract: ContractEntity
): Promise<void> {
  const assetService = Container.get(AssetService)
  const cdpService = Container.get(CdpService)

  const { execute_msg: executeMsg, sender } = msg
  const { height, txhash: txHash, timestamp } = txInfo
  const { govId } = contract
  const datetime = new Date(timestamp)

  const attributes = findAttributes(log.events, 'from_contract')
  const positionIdx = findAttribute(attributes, 'position_idx')

  let tx = {}
  let cdp: CdpEntity

  if (executeMsg['open_position']) {
    const mintAmount = findAttribute(attributes, 'mint_amount')
    const collateralAmount = findAttribute(attributes, 'collateral_amount')

    const mint = splitTokenAmount(mintAmount)
    const collateral = splitTokenAmount(collateralAmount)
    const asset = await assetService.get(
      { token: mint.token }, manager.getRepository(AssetEntity)
    )
    const assetId = asset.id

    cdp = new CdpEntity({
      idx: positionIdx,
      mintAmount: mint.amount,
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
    const depositAmount = findAttribute(attributes, 'deposit_amount')
    const deposit = splitTokenAmount(depositAmount)

    cdp = await cdpService.get({ idx: positionIdx }, manager.getRepository(CdpEntity))
    cdp.collateralAmount = num(cdp.collateralAmount).plus(deposit.amount).toString()

    tx = {
      type: TxType.DEPOSIT_COLLATERAL,
      data: { positionIdx, depositAmount },
      outValue: deposit.amount,
    }
  } else if (executeMsg['withdraw']) {
    const withdrawAmount = findAttribute(attributes, 'withdraw_amount')
    const withdraw = splitTokenAmount(withdrawAmount)

    cdp = await cdpService.get({ idx: positionIdx }, manager.getRepository(CdpEntity))
    cdp.collateralAmount = num(cdp.collateralAmount).minus(withdraw.amount).toString()

    tx = {
      type: TxType.WITHDRAW_COLLATERAL,
      data: {
        positionIdx,
        withdrawAmount,
        taxAmount: findAttribute(attributes, 'tax_amount'),
      },
      inValue: withdraw.amount,
    }
  } else if (executeMsg['mint']) {
    const mintAmount = findAttribute(attributes, 'mint_amount')
    const mint = splitTokenAmount(mintAmount)

    cdp = await cdpService.get({ idx: positionIdx }, manager.getRepository(CdpEntity))
    cdp.mintAmount = num(cdp.mintAmount).plus(mint.amount).toString()

    tx = {
      type: TxType.MINT,
      data: { positionIdx, mintAmount },
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
    executeMsg['open_position'] ||
    executeMsg['deposit'] ||
    executeMsg['withdraw'] ||
    executeMsg['mint']
  ) {
    parseCdp(manager, txInfo, msg, log, contract)
  }
}
