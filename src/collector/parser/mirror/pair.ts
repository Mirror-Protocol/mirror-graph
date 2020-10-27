import { findAttributes, findAttribute } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { assetService, priceService, statisticService, txService } from 'services'
import { AssetPositionsEntity, DailyStatisticEntity, PriceEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract, fee }: ParseArgs
): Promise<void> {
  const { address, token, govId } = contract
  const datetime = new Date(timestamp)
  const attributes = findAttributes(log.events, 'from_contract')
  const positionsRepo = manager.getRepository(AssetPositionsEntity)
  let parsed = {}
  let positions: AssetPositionsEntity

  if (msg['swap']) {
    const offerAsset = findAttribute(attributes, 'offer_asset')
    const askAsset = findAttribute(attributes, 'ask_asset')
    const offerAmount = findAttribute(attributes, 'offer_amount')
    const returnAmount = findAttribute(attributes, 'return_amount')
    const taxAmount = findAttribute(attributes, 'tax_amount')
    const spreadAmount = findAttribute(attributes, 'spread_amount')
    const lpCommissionAmount = findAttribute(attributes, 'lp_commission_amount')
    const ownerCommissionAmount = findAttribute(attributes, 'owner_commission_amount')
    const commissionAmount = num(lpCommissionAmount).plus(ownerCommissionAmount).toString()

    const type = offerAsset === 'uusd' ? TxType.BUY : TxType.SELL

    const volume = type === TxType.BUY
      ? offerAmount
      : num(returnAmount).plus(spreadAmount).plus(commissionAmount).toString()

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
        lpCommissionAmount,
        ownerCommissionAmount,
        recvAmount,
        price,
      },
      feeValue: commissionValue,
      volume
    }

    // add asset's pool position, account balance
    if (type === TxType.BUY) {
      const assetPoolChanged = num(returnAmount).plus(ownerCommissionAmount).multipliedBy(-1).toString()

      positions = await assetService().addPoolPosition(token, assetPoolChanged, offerAmount, positionsRepo)
    } else {
      const { transfer } = log.eventsByType

      let uusdAmountNum = num(0)
      for (let index = 0; index < transfer['sender'].length; index += 1) {
        const tokenAmount = splitTokenAmount(transfer['amount'][index])
        if (transfer['sender'][index] === address && tokenAmount.token === 'uusd') {
          uusdAmountNum = uusdAmountNum.minus(tokenAmount.amount)
        }
      }
      const uusdPoolChanged = uusdAmountNum.toString()

      positions = await assetService().addPoolPosition(token, offerAmount, uusdPoolChanged, positionsRepo)
    }

    // add daily trading volume
    const dailyStatRepo = manager.getRepository(DailyStatisticEntity)
    await statisticService().addDailyTradingVolume(datetime.getTime(), volume, dailyStatRepo)

  } else if (msg['provide_liquidity']) {
    const assets = findAttribute(attributes, 'assets')
    const share = findAttribute(attributes, 'share')
    const liquidities = assets.split(', ').map((assetAmount) => splitTokenAmount(assetAmount))
    const assetToken = liquidities[0]
    const uusdToken = liquidities[1]

    // add asset's liquidity position
    positions = await assetService().addLiquidityPosition(
      assetToken.token, assetToken.amount, uusdToken.amount, share, positionsRepo
    )

    parsed = {
      type: TxType.PROVIDE_LIQUIDITY,
      data: { assets, share }
    }
  } else if (msg['withdraw_liquidity']) {
    const refundAssets = findAttribute(attributes, 'refund_assets')
    const withdrawnShare = findAttribute(attributes, 'withdrawn_share')
    const liquidities = refundAssets.split(', ').map((assetAmount) => splitTokenAmount(assetAmount))
    const assetToken = liquidities[1]
    const uusdToken = liquidities[0]

    // remove asset's liquidity position
    positions = await assetService().addLiquidityPosition(
      assetToken.token, `-${assetToken.amount}`, `-${uusdToken.amount}`, `-${withdrawnShare}`, positionsRepo
    )

    parsed = {
      type: TxType.WITHDRAW_LIQUIDITY,
      data: { refundAssets, withdrawnShare }
    }
  } else {
    return
  }

  // set pool price ohlc
  const price = await priceService().setOHLC(
    token,
    datetime.getTime(),
    num(positions.uusdPool).dividedBy(positions.pool).toString(),
    manager.getRepository(PriceEntity),
    false
  )
  await manager.save(price)

  await txService().newTx(manager, {
    ...parsed, height, txHash, address: sender, datetime, govId, token, contract, fee
  })
}
