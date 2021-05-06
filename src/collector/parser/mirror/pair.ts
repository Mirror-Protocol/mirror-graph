import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { assetService, statisticService, txService } from 'services'
import { AssetPositionsEntity, DailyStatisticEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, contract, contractEvent, fee }: ParseArgs
): Promise<void> {
  const { token, govId } = contract
  const datetime = new Date(timestamp)
  const positionsRepo = manager.getRepository(AssetPositionsEntity)
  let parsed = {}

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
    ...parsed, height, txHash, address: sender, datetime, govId, token, contract, fee
  }, manager)
}
