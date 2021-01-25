import 'koa-body'
import * as Koa from 'koa'
import * as bluebird from 'bluebird'
import { KoaController, Controller, Validator, Validate, Get } from 'koa-joi-controllers'
import { success } from 'lib/response'
import { num } from 'lib/num'
import { assetService, statisticService, priceService } from 'services'
import { AssetStatus, Network } from 'types'

const Joi = Validator.Joi

async function getStatistic(): Promise<{
  totalValueLocked: string
  users24h: string
  transactions24h: string
  volume24h: string
}> {
  const statistic = await statisticService().statistic(Network.COMBINE)
  const latest24h = await statisticService().latest24h(Network.COMBINE)

  return {
    totalValueLocked: num(statistic.totalValueLocked).dividedBy(1000000).toFixed(6),
    users24h: latest24h.activeUsers,
    transactions24h: latest24h.transactions,
    volume24h: num(latest24h.volume).dividedBy(1000000).toFixed(6),
  }
}

async function getPools(format: string): Promise<unknown> {
  if (format === 'cmc-dex') {
    const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED }})
    const pools = {}
    await bluebird.map(assets, async (asset) => {
      const price = await priceService().getPrice(asset.token)
      const statistic = await statisticService().getAsset24h(Network.TERRA, asset.token)
      const uusdVolume = num(statistic.volume).dividedBy(1000000).toFixed(6)
      pools[`${asset.token}-UST`] = {
        base_id: asset.token,
        base_name: asset.symbol,
        base_symbol: asset.symbol,
        quote_id: 'UST',
        quote_name: 'TerraUSD',
        quote_symbol: 'UST',
        last_price: price,
        base_volume: num(uusdVolume).dividedBy(price).toFixed(6),
        quote_volume: uusdVolume
      }
    })
    const ethAssetInfos = await assetService().getEthAssetInfos()
    const wrappedUstToken = '0xa47c8bf37f92aBed4A126BDA807A7b7498661acD'
    await bluebird.map(assets, async (asset) => {
      const ethAsset = await assetService().getEthAsset(asset.token)
      const { price } = ethAssetInfos[ethAsset.token]
      const statistic = await statisticService().getAsset24h(Network.ETH, asset.token)
      const uusdVolume = num(statistic.volume).dividedBy(1000000).toFixed(6)

      const baseName = asset.symbol === 'MIR'
        ? `Wrapped MIR Token`
        : `Wrapped Mirror ${asset.symbol.substring(1)} Token`
      pools[`${ethAsset.token}-${wrappedUstToken}`] = {
        base_id: ethAsset.token,
        base_name: baseName,
        base_symbol: asset.symbol,
        quote_id: 'Wrapped UST',
        quote_name: 'Wrapped UST Token',
        quote_symbol: 'UST',
        last_price: price,
        base_volume: num(uusdVolume).dividedBy(price).toFixed(6),
        quote_volume: uusdVolume
      }
    })

    return pools
  } else if (format === 'cmc-yield-farming') {
    const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED }})

    const pools = [
      ...await bluebird.map(assets, async (asset) => ({
        name: `Terra ${asset.symbol}-UST LP`,
        pair: `${asset.symbol}-UST`,
        pairLink: 'https://terra.mirror.finance/stake',
        logo: `https://whitelist.mirror.finance/icon/MIR/100x100.png`,
        poolRewards: ['MIR'],
        apr: +(await statisticService().getAssetAPY(Network.TERRA, asset.token)), // APY, 1.1 means 110%
        totalStaked: +num(await statisticService().getAssetLiquidity(Network.TERRA, asset.token))
          .dividedBy(1000000)
          .toFixed(2), // Total valued lock in USD 
      })),
      ...await bluebird.map(assets, async (asset) => ({
        name: `Ethereum ${asset.symbol}-UST LP`,
        pair: `${asset.symbol}-UST`,
        pairLink: 'https://eth.mirror.finance/',
        logo: `https://whitelist.mirror.finance/icon/MIR/100x100.png`,
        poolRewards: ['MIR'],
        apr: +(await statisticService().getAssetAPY(Network.ETH, asset.token)), // APY, 1.1 means 110%
        totalStaked: +num(await statisticService().getAssetLiquidity(Network.ETH, asset.token))
          .dividedBy(1000000)
          .toFixed(2), // Total valued lock in USD 
      })),
    ]

    return {
      provider: 'Mirror Protocol',
      provider_logo: 'https://whitelist.mirror.finance/icon/MIR/100x100.png',
      provider_URL: 'https://terra.mirror.finance/',
      links: [
        { title: 'Medium', link: 'https://mirror-protocol.medium.com/' },
        { title: 'Twitter', link: 'https://twitter.com/mirror_protocol' },
        { title: 'Discord', link: 'https://discord.com/invite/KYC22sngFn' },
        { title: 'Telegram', link: 'https://t.me/mirror_protocol' },
      ], 
      pools,
    }
  } else if (format === 'coingecko') {
    const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED }})
    const pools = {}
    await bluebird.map(assets, async (asset) => {
      pools[`Terra ${asset.symbol}-UST`] = {
        poolAPY: +(await statisticService().getAssetAPY(Network.TERRA, asset.token)),
        totalLockedVal: +num(await statisticService().getAssetLiquidity(Network.TERRA, asset.token))
          .dividedBy(1000000)
          .toFixed(2)
      }
    })
    await bluebird.map(assets, async (asset) => {
      pools[`Ethereum ${asset.symbol}-UST`] = {
        poolAPY: +(await statisticService().getAssetAPY(Network.ETH, asset.token)),
        totalLockedVal: +num(await statisticService().getAssetLiquidity(Network.ETH, asset.token))
          .dividedBy(1000000)
          .toFixed(2)
      }
    })

    return pools
  }
}

@Controller('/statistic')
export default class StatisticController extends KoaController {
  @Get('/')
  async getStatistic(ctx: Koa.Context): Promise<void> {
    success(ctx, await getStatistic())
  }

  @Get('/pools')
  @Validate({
    query: {
      format: Joi.string().required().valid(['cmc-dex', 'cmc-yield-farming', 'coingecko']).description('format must be [cmc, coingecko])'),
    }
  })
  async getPools(ctx: Koa.Context): Promise<void> {
    const { format } = ctx.request.query

    success(ctx, await getPools(format))
  }
}
