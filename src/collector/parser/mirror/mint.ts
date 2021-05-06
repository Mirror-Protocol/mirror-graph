import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { assetService, accountService, cdpService, oracleService, txService } from 'services'
import { CdpEntity, AssetPositionsEntity, BalanceEntity, OraclePriceEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, contract, contractEvent, fee }: ParseArgs
): Promise<void> {
  const cdpRepo = manager.getRepository(CdpEntity)
  const positionsRepo = manager.getRepository(AssetPositionsEntity)
  const balanceRepo = manager.getRepository(BalanceEntity)
  const oracleRepo = manager.getRepository(OraclePriceEntity)

  const { govId } = contract
  const datetime = new Date(timestamp)

  let cdp: CdpEntity
  let tx = {}
  let address = sender

  const actionType = contractEvent.action?.actionType
  if (!actionType) {
    return
  }

  if (actionType === 'open_position') {
    const { positionIdx, mintAmount, collateralAmount } = contractEvent.action

    const mint = splitTokenAmount(mintAmount)
    const collateral = splitTokenAmount(collateralAmount)

    // create cdp
    cdp = new CdpEntity({
      id: positionIdx,
      address,
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
  } else if (actionType === 'deposit') {
    const { positionIdx, depositAmount } = contractEvent.action
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
  } else if (actionType === 'withdraw') {
    const { positionIdx, withdrawAmount, protocolFee: protocolFeeAmount, taxAmount } = contractEvent.action
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
        taxAmount,
        protocolFeeAmount
      },
      token: withdraw.token,
      tags: [withdraw.token],
    }
  } else if (actionType === 'mint') {
    const { positionIdx, mintAmount } = contractEvent.action
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
  } else if (actionType === 'burn') {
    const { positionIdx, burnAmount } = contractEvent.action
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
  } else if (actionType === 'auction') {
    const { positionIdx, liquidatedAmount, returnCollateralAmount, protocolFee: protocolFeeAmount, taxAmount } = contractEvent.action

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
      data: { positionIdx, liquidatedAmount, returnCollateralAmount, taxAmount, protocolFeeAmount, liquidator: sender },
      token: liquidated.token,
      tags: [liquidated.token, returnCollateral.token],
    }

    // save sender's tx
    await txService().newTx({
      ...tx, height, txHash, address, datetime, govId, contract, fee
    }, manager)

    // change address to cdp owner's address for tx
    address = cdp.address
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
    ...tx, height, txHash, address, datetime, govId, contract, fee
  }, manager)
}
