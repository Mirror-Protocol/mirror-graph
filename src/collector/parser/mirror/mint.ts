import { findAttributes, findAttribute } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { cdpService } from 'services'
import { TxEntity, CdpEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract }: ParseArgs
): Promise<void> {
  const cdpRepo = manager.getRepository(CdpEntity)

  const { govId } = contract
  const datetime = new Date(timestamp)

  let cdp: CdpEntity
  let tx = {}

  const attributes = findAttributes(log.events, 'from_contract')
  const positionIdx = findAttribute(attributes, 'position_idx')

  if (msg['open_position']) {
    const mintAmount = findAttribute(attributes, 'mint_amount')
    const collateralAmount = findAttribute(attributes, 'collateral_amount')

    const mint = splitTokenAmount(mintAmount)
    const collateral = splitTokenAmount(collateralAmount)

    cdp = new CdpEntity({
      id: positionIdx,
      mintAmount: mint.amount,
      collateralToken: collateral.token,
      collateralAmount: collateral.amount,
      token: mint.token,
    })

    tx = {
      type: TxType.OPEN_POSITION,
      data: { positionIdx, mintAmount, collateralAmount },
      outValue: collateral.amount,
      token: mint.token,
    }
  } else if (msg['deposit']) {
    const depositAmount = findAttribute(attributes, 'deposit_amount')
    const deposit = splitTokenAmount(depositAmount)

    cdp = await cdpService().get({ id: positionIdx }, cdpRepo)
    cdp.collateralAmount = num(cdp.collateralAmount).plus(deposit.amount).toString()

    tx = {
      type: TxType.DEPOSIT_COLLATERAL,
      data: { positionIdx, depositAmount },
      outValue: deposit.amount,
      token: deposit.token,
    }
  } else if (msg['withdraw']) {
    const withdrawAmount = findAttribute(attributes, 'withdraw_amount')
    const withdraw = splitTokenAmount(withdrawAmount)

    cdp = await cdpService().get({ id: positionIdx }, cdpRepo)
    cdp.collateralAmount = num(cdp.collateralAmount).minus(withdraw.amount).toString()

    tx = {
      type: TxType.WITHDRAW_COLLATERAL,
      data: {
        positionIdx,
        withdrawAmount,
        taxAmount: findAttribute(attributes, 'tax_amount'),
      },
      inValue: withdraw.amount,
      token: withdraw.token,
    }
  } else if (msg['mint']) {
    const mintAmount = findAttribute(attributes, 'mint_amount')
    const mint = splitTokenAmount(mintAmount)

    cdp = await cdpService().get({ id: positionIdx }, cdpRepo)
    cdp.mintAmount = num(cdp.mintAmount).plus(mint.amount).toString()

    tx = {
      type: TxType.MINT,
      data: { positionIdx, mintAmount },
      token: mint.token,
    }
  } else if (msg['burn']) {
    const burnAmount = findAttribute(attributes, 'burn_amount')
    const burn = splitTokenAmount(burnAmount)

    cdp = await cdpService().get({ id: positionIdx }, cdpRepo)
    cdp.mintAmount = num(cdp.mintAmount).minus(burn.amount).toString()

    tx = {
      type: TxType.BURN,
      data: { positionIdx, burnAmount },
      token: burn.token,
    }
  } else {
    return
  }

  const txEntity = new TxEntity({
    ...tx, height, txHash, account: sender, datetime, govId, contract
  })
  await manager.save([cdp, txEntity])
}
