import { findContractAction, isNativeToken } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { assetService, accountService, cdpService, oracleService, txService, collateralService } from 'services'
import { CdpEntity, AssetEntity, AssetPositionsEntity, BalanceEntity, OraclePriceEntity } from 'orm'
import { TxType, AssetStatus } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, contract, contractEvent, contractEvents, fee, log }: ParseArgs
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
    const isShort = contractEvent.action?.isShort === 'true'

    const mint = splitTokenAmount(mintAmount)
    const collateral = splitTokenAmount(collateralAmount)

    if (!isNativeToken(collateral.token)) {
      address = findContractAction(contractEvents, collateral.token, {
        actionType: 'send', to: contract.address, amount: collateral.amount
      }).action.from
    }

    // create cdp
    cdp = new CdpEntity({
      id: positionIdx,
      address,
      token: mint.token,
      mintAmount: mint.amount,
      collateralToken: collateral.token,
      collateralAmount: collateral.amount,
      isShort
    })

    // add mint position
    await assetService().addMintPosition(mint.token, mint.amount, positionsRepo)

    if (!isShort) {
      // add minted amount to account balance
      const price = await oracleService().getPriceAt(mint.token, datetime.getTime(), oracleRepo)
      await accountService().addBalance(address, mint.token, price, mint.amount, datetime, balanceRepo)
    }

    tx = {
      type: TxType.OPEN_POSITION,
      data: { positionIdx, mintAmount, collateralAmount, isShort },
      token: mint.token,
      tags: [mint.token, collateral.token],
    }
  } else if (actionType === 'deposit') {
    const { positionIdx, depositAmount } = contractEvent.action
    const deposit = splitTokenAmount(depositAmount)

    if (!isNativeToken(deposit.token)) {
      address = findContractAction(contractEvents, deposit.token, {
        actionType: 'send', to: contract.address, amount: deposit.amount
      }).action.from
    }

    // add cdp collateral
    cdp = await cdpService().get({ id: positionIdx }, undefined, cdpRepo)
    cdp.collateralAmount = num(cdp.collateralAmount).plus(deposit.amount).toString()

    tx = {
      type: TxType.DEPOSIT_COLLATERAL,
      data: { positionIdx, depositAmount },
      token: cdp.token,
      tags: [deposit.token],
    }
  } else if (actionType === 'withdraw') {
    const { positionIdx, withdrawAmount, taxAmount } = contractEvent.action
    const withdraw = splitTokenAmount(withdrawAmount)

    // remove cdp collateral
    cdp = await cdpService().get({ id: positionIdx }, undefined, cdpRepo)
    cdp.collateralAmount = num(cdp.collateralAmount).minus(withdraw.amount).toString()

    tx = {
      type: TxType.WITHDRAW_COLLATERAL,
      data: {
        positionIdx,
        withdrawAmount,
        taxAmount
      },
      token: cdp.token,
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
    const price = await oracleService().getPriceAt(mint.token, datetime.getTime(), oracleRepo)
    await accountService().addBalance(address, mint.token, price, mint.amount, datetime, balanceRepo)

    tx = {
      type: TxType.MINT,
      data: { positionIdx, mintAmount },
      token: mint.token,
      tags: [mint.token],
    }
  } else if (actionType === 'burn') {
    const {
      positionIdx,
      burnAmount,
      protocolFee: protocolFeeAmount,
      refundCollateralAmount
    } = contractEvent.action
    const burn = splitTokenAmount(burnAmount)

    address = findContractAction(contractEvents, burn.token, {
      actionType: 'send', to: contract.address, amount: burn.amount
    }).action.from

    // remove cdp's mint amount
    cdp = await cdpService().get({ id: positionIdx }, undefined, cdpRepo)
    cdp.mintAmount = num(cdp.mintAmount).minus(burn.amount).toString()

    if (refundCollateralAmount) {
      const refundCollateral = splitTokenAmount(refundCollateralAmount)

      cdp.collateralAmount = num(cdp.collateralAmount).minus(refundCollateral.amount).toString()
    }

    if (protocolFeeAmount) {
      const protocolFee = splitTokenAmount(protocolFeeAmount)

      cdp.collateralAmount = num(cdp.collateralAmount).minus(protocolFee.amount).toString()
    }

    // remove asset's mint position
    await assetService().addMintPosition(burn.token, `-${burn.amount}`, positionsRepo)

    tx = {
      type: TxType.BURN,
      data: { positionIdx, burnAmount, refundCollateralAmount, protocolFeeAmount },
      token: burn.token,
      tags: [burn.token],
    }
  } else if (actionType === 'auction') {
    const { positionIdx, liquidatedAmount, returnCollateralAmount, protocolFee: protocolFeeAmount, taxAmount } = contractEvent.action

    const liquidated = splitTokenAmount(liquidatedAmount)
    const returnCollateral = splitTokenAmount(returnCollateralAmount)
    const protocolFee = splitTokenAmount(protocolFeeAmount)

    address = findContractAction(contractEvents, liquidated.token, {
      actionType: 'send', to: contract.address
    }).action.from

    cdp = await cdpService().get({ id: positionIdx }, undefined, cdpRepo)
    cdp.mintAmount = num(cdp.mintAmount).minus(liquidated.amount).toString()
    cdp.collateralAmount = num(cdp.collateralAmount)
      .minus(returnCollateral.amount)
      .minus(protocolFee.amount)
      .toString()

    if (cdp.mintAmount === '0' || cdp.collateralAmount === '0') {
      // remove asset's mint position
      await assetService().addMintPosition(liquidated.token, `-${cdp.mintAmount}`, positionsRepo)

      cdp.mintAmount = '0'
      cdp.collateralAmount = '0'
      cdp.collateralRatio = '0'
    } else {
      // remove asset's mint position
      await assetService().addMintPosition(liquidated.token, `-${liquidated.amount}`, positionsRepo)
    }

    tx = {
      type: TxType.AUCTION,
      data: { positionIdx, liquidatedAmount, returnCollateralAmount, taxAmount, protocolFeeAmount, liquidator: address },
      token: liquidated.token,
      tags: [liquidated.token, returnCollateral.token],
    }

    // save sender's tx
    await txService().newTx({
      ...tx, height, txHash, address, datetime, govId, contract, fee
    }, manager)

    // change address to cdp owner's address for tx
    address = cdp.address
  } else if (actionType === 'trigger_ipo') {
    const { assetToken: token } = contractEvent.action

    // listing pre-ipo asset
    const asset = await assetService().get({ token }, undefined, manager.getRepository(AssetEntity))
    if (asset.status !== AssetStatus.PRE_IPO) {
      throw new Error(`triggered to not pre-ipo asset`)
    }

    asset.status = AssetStatus.LISTED

    await manager.save(asset)

    return
  } else {
    return
  }

  // calculate collateral ratio
  const { token, collateralToken } = cdp
  const tokenPrice = await oracleService().getPriceAt(token, datetime.getTime(), oracleRepo)
  const collateralPrice = await collateralService().getPrice(collateralToken)

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
