import { findContractAction } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { assetService, govService, statisticService, txService } from 'services'
import { AssetEntity, AssetPositionsEntity, DailyStatisticEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, contract, contractEvent, contractEvents, fee }: ParseArgs
): Promise<void> {
  const { token, govId } = contract
  const datetime = new Date(timestamp)
  const positionsRepo = manager.getRepository(AssetPositionsEntity)
  const assetRepo = manager.getRepository(AssetEntity)
  let parsed = {}
  let address = sender

  const actionType = contractEvent.action?.actionType
  if (!actionType) {
    return
  }

  if (actionType === 'swap') {
    const {
      offerAsset, askAsset, offerAmount, returnAmount, taxAmount, spreadAmount, commissionAmount
    } = contractEvent.action
    const type = offerAsset === 'uusd' ? TxType.BUY : TxType.SELL
    const volume = type === TxType.BUY
      ? offerAmount
      : num(returnAmount).plus(spreadAmount).plus(commissionAmount).toString()

    if (offerAmount === '0' || returnAmount === '0') {
      return
    }

    if (type === TxType.SELL) {
      address = findContractAction(contractEvents, token, {
        actionType: 'send', to: contract.address, amount: offerAmount
      }).action.from

      // if transaction from mint contract = opened short position
      // so, transaction owner is short token staker
      const gov = govService().get()
      if (address === gov.mint) {
        address = findContractAction(contractEvents, gov.staking, {
          actionType: 'increase_short_token', amount: offerAmount
        }).action.stakerAddr
      }
    }

    // buy price: offer / return
    // sell price: return / offer
    const price = type === TxType.BUY
      ? num(offerAmount).dividedBy(returnAmount).toString()
      : num(returnAmount).dividedBy(offerAmount).toString()

    // buy fee: buy price * commission
    const commissionValue = type === TxType.BUY
      ? num(price).multipliedBy(commissionAmount).toString()
      : commissionAmount

    const recvAmount = num(returnAmount).minus(taxAmount).toString()

    parsed = {
      type,
      data: {
        offerAsset,
        askAsset,
        offerAmount,
        returnAmount,
        taxAmount,
        spreadAmount,
        commissionAmount,
        recvAmount,
        price,
      },
      commissionValue,
      volume,
      tags: [offerAsset, askAsset]
    }

    // add daily trading volume
    const dailyStatRepo = manager.getRepository(DailyStatisticEntity)
    await statisticService().addDailyTradingVolume(datetime.getTime(), volume, dailyStatRepo)
  } else if (actionType === 'provide_liquidity') {
    const { assets, share } = contractEvent.action
    const liquidities = assets.split(', ').map((assetAmount) => splitTokenAmount(assetAmount))
    const assetToken = liquidities.find((liquidity) => liquidity.token !== 'uusd')
    const uusdToken = liquidities.find((liquidity) => liquidity.token === 'uusd')

    address = findContractAction(contractEvents, token, {
      actionType: 'transfer_from', to: contract.address, amount: assetToken.amount
    }).action.from

    // add asset's liquidity position
    await assetService().addLiquidityPosition(
      assetToken.token, share, positionsRepo
    )

    parsed = {
      type: TxType.PROVIDE_LIQUIDITY,
      data: { assets, share },
      tags: [assetToken.token, uusdToken.token],
    }
  } else if (actionType === 'withdraw_liquidity') {
    const { refundAssets, withdrawnShare } = contractEvent.action
    const liquidities = refundAssets.split(', ').map((assetAmount) => splitTokenAmount(assetAmount))
    const assetToken = liquidities.find((liquidity) => liquidity.token !== 'uusd')
    const uusdToken = liquidities.find((liquidity) => liquidity.token === 'uusd')

    const asset = await assetService().get({ token }, undefined, assetRepo)

    address = findContractAction(contractEvents, asset.lpToken, {
      actionType: 'send', to: contract.address, amount: withdrawnShare
    }).action.from

    // remove asset's liquidity position
    await assetService().addLiquidityPosition(
      assetToken.token, `-${withdrawnShare}`, positionsRepo
    )

    parsed = {
      type: TxType.WITHDRAW_LIQUIDITY,
      data: { refundAssets, withdrawnShare },
      tags: [assetToken.token, uusdToken.token],
    }
  } else {
    return
  }

  await txService().newTx({
    ...parsed, height, txHash, address, datetime, govId, token, contract, fee
  }, manager)
}
