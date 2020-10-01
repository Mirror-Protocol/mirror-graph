import { Container } from 'typedi'
import { findAttributes, findAttribute } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { AssetService, CdpService } from 'services'
import { AssetEntity, TxEntity, CdpEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './types'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract }: ParseArgs
): Promise<void> {
  const assetService = Container.get(AssetService)
  const cdpService = Container.get(CdpService)

  const { govId } = contract
  const datetime = new Date(timestamp)

  const attributes = findAttributes(log.events, 'from_contract')
  const positionIdx = findAttribute(attributes, 'position_idx')

  let tx = {}
  let cdp: CdpEntity

  if (msg['open_position']) {
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
  } else if (msg['deposit']) {
    const depositAmount = findAttribute(attributes, 'deposit_amount')
    const deposit = splitTokenAmount(depositAmount)

    cdp = await cdpService.get({ idx: positionIdx }, manager.getRepository(CdpEntity))
    cdp.collateralAmount = num(cdp.collateralAmount).plus(deposit.amount).toString()

    tx = {
      type: TxType.DEPOSIT_COLLATERAL,
      data: { positionIdx, depositAmount },
      outValue: deposit.amount,
      assetId: cdp.assetId,
    }
  } else if (msg['withdraw']) {
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
      assetId: cdp.assetId,
    }
  } else if (msg['mint']) {
    const mintAmount = findAttribute(attributes, 'mint_amount')
    const mint = splitTokenAmount(mintAmount)

    cdp = await cdpService.get({ idx: positionIdx }, manager.getRepository(CdpEntity))
    cdp.mintAmount = num(cdp.mintAmount).plus(mint.amount).toString()

    tx = {
      type: TxType.MINT,
      data: { positionIdx, mintAmount },
      assetId: cdp.assetId,
    }
  } else if (msg['burn']) {
    const burnAmount = findAttribute(attributes, 'burn_amount')
    const burn = splitTokenAmount(burnAmount)

    cdp = await cdpService.get({ idx: positionIdx }, manager.getRepository(CdpEntity))
    cdp.mintAmount = num(cdp.mintAmount).minus(burn.amount).toString()

    tx = {
      type: TxType.BURN,
      data: { positionIdx, burnAmount },
      assetId: cdp.assetId,
    }
  } else {
    return
  }

  const txEntity = new TxEntity({
    ...tx, height, txHash, sender, datetime, govId, contract
  })
  await manager.save([cdp, txEntity])
}
