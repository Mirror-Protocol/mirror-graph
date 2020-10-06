import { findAttributes, findAttribute } from 'lib/terra'
import { splitTokenAmount } from 'lib/utils'
import { num } from 'lib/num'
import { assetService, accountService, priceService, statisticService } from 'services'
import { TxEntity, AssetPositionsEntity, DailyStatisticEntity, PriceEntity, BalanceEntity } from 'orm'
import { TxType } from 'types'
import { ParseArgs } from './parseArgs'

export async function parse(
  { manager, height, txHash, timestamp, sender, msg, log, contract }: ParseArgs
): Promise<void> {
  const { token, govId } = contract
  const datetime = new Date(timestamp)
  const attributes = findAttributes(log.events, 'from_contract')
  const positionsRepo = manager.getRepository(AssetPositionsEntity)
  const balanceRepo = manager.getRepository(BalanceEntity)
  let parsed = {}
  let positions: AssetPositionsEntity

  if (msg['swap']) {
    const offerAsset = findAttribute(attributes, 'offer_asset')
    const askAsset = findAttribute(attributes, 'ask_asset')
    const offerAmount = findAttribute(attributes, 'offer_amount')
    const returnAmount = findAttribute(attributes, 'return_amount')
    const taxAmount = findAttribute(attributes, 'tax_amount')
    const spreadAmount = findAttribute(attributes, 'spread_amount')
    const commissionAmount = findAttribute(attributes, 'commission_amount')
    const recvAmount = num(returnAmount).minus(taxAmount).toString()

    const type = offerAsset === 'uusd' ? TxType.BUY : TxType.SELL
    const volume = type === TxType.BUY ? offerAmount : returnAmount

    const price = type === TxType.BUY
      // buy price: offer / (return - commission)
      ? num(offerAmount).dividedBy(num(returnAmount).minus(commissionAmount)).toString()
      // sell price: (return + commission) / offer
      : num(returnAmount).plus(commissionAmount).dividedBy(offerAmount).toString()

    const feeValue = type === TxType.BUY
      ? num(price).multipliedBy(commissionAmount).toString()
      : commissionAmount

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
      },
      feeValue,
      volume
    }

    // add asset's pool position
    positions = await assetService().addPoolPosition(
      token,
      type === TxType.BUY ? `-${returnAmount}` : offerAmount,
      type === TxType.BUY ? offerAmount : `-${returnAmount}`,
      positionsRepo
    )

    // add account balance
    await accountService().addBalance(
      sender,
      token,
      price,
      type === TxType.BUY ? recvAmount : `-${offerAmount}`,
      balanceRepo
    )

    // add daily trading volume
    const dailyStatRepo = manager.getRepository(DailyStatisticEntity)
    await statisticService().addDailyTradingVolume(datetime.getTime(), volume, dailyStatRepo)
  } else if (msg['provide_liquidity']) {
    const assets = findAttribute(attributes, 'assets')
    const liquidities = assets.split(', ').map((assetAmount) => splitTokenAmount(assetAmount))
    const assetToken = liquidities[0]
    const uusdToken = liquidities[1]

    parsed = {
      type: TxType.PROVIDE_LIQUIDITY,
      data: { assets, share: findAttribute(attributes, 'share') }
    }

    // remove account balance
    const price = await priceService().getPrice(token, datetime.getTime(), manager.getRepository(PriceEntity))
    await accountService().addBalance(sender, token, price, `-${assetToken.amount}`, balanceRepo)

    // add asset's liquidity position
    positions = await assetService().addLiquidityPosition(
      assetToken.token, assetToken.amount, uusdToken.amount, positionsRepo
    )
  } else if (msg['withdraw_liquidity']) {
    const refundAssets = findAttribute(attributes, 'refund_assets')
    const liquidities = refundAssets.split(', ').map((assetAmount) => splitTokenAmount(assetAmount))
    const assetToken = liquidities[1]
    const uusdToken = liquidities[0]

    parsed = {
      type: TxType.WITHDRAW_LIQUIDITY,
      data: { refundAssets, withdrawnShare: findAttribute(attributes, 'withdrawn_share') }
    }

    // add account balance
    const price = await priceService().getPrice(token, datetime.getTime(), manager.getRepository(PriceEntity))
    await accountService().addBalance(sender, token, price, assetToken.amount, balanceRepo)

    // remove asset's liquidity position
    positions = await assetService().addLiquidityPosition(
      assetToken.token, `-${assetToken.amount}`, `-${uusdToken.amount}`, positionsRepo
    )
  } else {
    return
  }

  // set pool price ohlc
  const tx = new TxEntity({
    ...parsed, height, txHash, account: sender, datetime, govId, token, contract
  })

  const price = await priceService().setOHLC(
    token,
    datetime.getTime(),
    num(positions.uusdPool).dividedBy(positions.pool).toString(),
    manager.getRepository(PriceEntity),
    false
  )

  await manager.save([tx, price])
}
