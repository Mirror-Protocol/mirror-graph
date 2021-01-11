import { findAttributes, findAttribute } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { assetService, accountService, cdpService, oracleService, txService } from 'services'
import { CdpEntity, AssetPositionsEntity, BalanceEntity, OraclePriceEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract, fee }: ParseArgs
): Promise<void> {
  const cdpRepo = manager.getRepository(CdpEntity)
  const positionsRepo = manager.getRepository(AssetPositionsEntity)
  const balanceRepo = manager.getRepository(BalanceEntity)
  const oracleRepo = manager.getRepository(OraclePriceEntity)

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

    // create cdp
    cdp = new CdpEntity({
      id: positionIdx,
      address: sender,
      token: mint.token,
      mintAmount: mint.amount,
      collateralToken: collateral.token,
      collateralAmount: collateral.amount,
    })

    // add mint/asCollateral position
    await assetService().addMintPosition(mint.token, mint.amount, positionsRepo)
    await assetService().addAsCollateralPosition(collateral.token, collateral.amount, positionsRepo)

    // add account balance
    const price = await oracleService().getPrice(mint.token, datetime.getTime(), oracleRepo)
    await accountService().addBalance(sender, mint.token, price, mint.amount, datetime, balanceRepo)

    tx = {
      type: TxType.OPEN_POSITION,
      data: { positionIdx, mintAmount, collateralAmount },
      token: mint.token,
      tags: [mint.token, collateral.token],
    }
  } else if (msg['deposit']) {
    const depositAmount = findAttribute(attributes, 'deposit_amount')
    const deposit = splitTokenAmount(depositAmount)

    // add cdp collateral
    cdp = await cdpService().get({ id: positionIdx }, undefined, cdpRepo)
    cdp.collateralAmount = num(cdp.collateralAmount).plus(deposit.amount).toString()

    // add asset's asCollateral position
    await assetService().addAsCollateralPosition(deposit.token, deposit.amount, positionsRepo)

    tx = {
      type: TxType.DEPOSIT_COLLATERAL,
      data: { positionIdx, depositAmount },
      token: deposit.token,
      tags: [deposit.token],
    }
  } else if (msg['withdraw']) {
    const withdrawAmount = findAttribute(attributes, 'withdraw_amount')
    const protocolFeeAmount = findAttribute(attributes, 'protocol_fee')
    const withdraw = splitTokenAmount(withdrawAmount)
    const protocolFee = splitTokenAmount(protocolFeeAmount)

    const totalWithdraw = num(withdraw.amount).plus(protocolFee.amount).toString()

    // remove cdp collateral
    cdp = await cdpService().get({ id: positionIdx }, undefined, cdpRepo)
    cdp.collateralAmount = num(cdp.collateralAmount).minus(totalWithdraw).toString()

    // remove asset's asCollateral position
    await assetService().addAsCollateralPosition(withdraw.token, `-${totalWithdraw}`, positionsRepo)

    tx = {
      type: TxType.WITHDRAW_COLLATERAL,
      data: {
        positionIdx,
        withdrawAmount,
        taxAmount: findAttribute(attributes, 'tax_amount'),
        protocolFeeAmount
      },
      token: withdraw.token,
      tags: [withdraw.token],
    }
  } else if (msg['mint']) {
    const mintAmount = findAttribute(attributes, 'mint_amount')
    const mint = splitTokenAmount(mintAmount)

    // add cdp mint
    cdp = await cdpService().get({ id: positionIdx }, undefined, cdpRepo)
    cdp.mintAmount = num(cdp.mintAmount).plus(mint.amount).toString()

    // add asset's mint position
    await assetService().addMintPosition(mint.token, mint.amount, positionsRepo)

    // add account balance
    const price = await oracleService().getPrice(mint.token, datetime.getTime(), oracleRepo)
    await accountService().addBalance(sender, mint.token, price, mint.amount, datetime, balanceRepo)

    tx = {
      type: TxType.MINT,
      data: { positionIdx, mintAmount },
      token: mint.token,
      tags: [mint.token],
    }
  } else if (msg['burn']) {
    const burnAmount = findAttribute(attributes, 'burn_amount')
    const burn = splitTokenAmount(burnAmount)

    // remove cdp mint
    cdp = await cdpService().get({ id: positionIdx }, undefined, cdpRepo)
    cdp.mintAmount = num(cdp.mintAmount).minus(burn.amount).toString()

    // remove asset's mint position
    await assetService().addMintPosition(burn.token, `-${burn.amount}`, positionsRepo)

    tx = {
      type: TxType.BURN,
      data: { positionIdx, burnAmount },
      token: burn.token,
      tags: [burn.token],
    }
  } else if (msg['auction']) {
    const liquidatedAmount = findAttribute(attributes, 'liquidated_amount')
    const returnCollateralAmount = findAttribute(attributes, 'return_collateral_amount')
    const protocolFeeAmount = findAttribute(attributes, 'protocol_fee')
    const taxAmount = findAttribute(attributes, 'tax_amount')

    const liquidated = splitTokenAmount(liquidatedAmount)
    const returnCollateral = splitTokenAmount(returnCollateralAmount)
    const protocolFee = splitTokenAmount(protocolFeeAmount)

    cdp = await cdpService().get({ id: positionIdx }, undefined, cdpRepo)
    cdp.mintAmount = num(cdp.mintAmount).minus(liquidated.amount).toString()
    cdp.collateralAmount = num(cdp.collateralAmount)
      .minus(returnCollateral.amount)
      .minus(protocolFee.amount)
      .toString()

    if (cdp.mintAmount === '0' || cdp.collateralAmount === '0') {
      // remove asset's mint position
      await assetService().addMintPosition(liquidated.token, `-${cdp.mintAmount}`, positionsRepo)

      // remove asset's asCollateral position
      await assetService().addAsCollateralPosition(returnCollateral.token, `-${cdp.collateralAmount}`, positionsRepo)

      cdp.mintAmount = '0'
      cdp.collateralAmount = '0'
      cdp.collateralRatio = '0'
    } else {
      // remove asset's mint position
      await assetService().addMintPosition(liquidated.token, `-${liquidated.amount}`, positionsRepo)

      // remove asset's asCollateral position
      await assetService().addAsCollateralPosition(returnCollateral.token, `-${returnCollateral.amount}`, positionsRepo)
    }

    tx = {
      type: TxType.AUCTION,
      data: { positionIdx, liquidatedAmount, returnCollateralAmount, taxAmount, protocolFeeAmount },
      token: liquidated.token,
      tags: [liquidated.token, returnCollateral.token],
    }
  } else {
    return
  }

  // calculate collateral ratio
  const { token, collateralToken } = cdp
  const tokenPrice = await oracleService().getPrice(token, datetime.getTime(), oracleRepo)
  const collateralPrice = collateralToken !== 'uusd'
    ? await oracleService().getPrice(collateralToken, datetime.getTime(), oracleRepo)
    : '1'

  if (tokenPrice && collateralPrice) {
    const { mintAmount, collateralAmount } = cdp
    const mintValue = num(tokenPrice).multipliedBy(mintAmount)
    const collateralValue = num(collateralPrice).multipliedBy(collateralAmount)

    cdp.collateralRatio = (mintValue.isGreaterThan(0) && collateralValue.isGreaterThan(0))
      ? collateralValue.dividedBy(mintValue).toString()
      : '0'
  }

  await manager.save(cdp)

  await txService().newTx({
    ...tx, height, txHash, address: sender, datetime, govId, contract, fee
  }, manager)
}
