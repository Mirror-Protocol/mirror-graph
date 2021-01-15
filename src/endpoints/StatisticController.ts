import 'koa-body'
import * as Koa from 'koa'
import * as bluebird from 'bluebird'
import { KoaController, Controller, Validator, Validate, Get } from 'koa-joi-controllers'
import { success } from 'lib/response'
import { num } from 'lib/num'
import { assetService, statisticService } from 'services'
import { AssetStatus, Network } from 'types'

const Joi = Validator.Joi

@Controller('/statistic')
export default class StatisticController extends KoaController {
  @Get('/pools')
  @Validate({
    query: {
      format: Joi.string().required().valid(['cmc', 'coingecko']).description('format must be [cmc, coingecko])'),
    }
  })
  async getPools(ctx: Koa.Context): Promise<void> {
    const { format } = ctx.request.query

    if (format === 'cmc') {
      const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED }})
      const pools = [
        ...await bluebird.map(assets, async (asset) => ({
          name: `Terra ${asset.symbol}-UST LP`,
          pair: `${asset.symbol}-UST`,
          pairLink: 'https://terra.mirror.finance/stake',
          logo: `https://whitelist.mirror.finance/icon/MIR/100x100.png`,
          poolRewards: ['MIR'],
          apr: +(await statisticService().getAssetAPR(Network.TERRA, asset.token)), // APY, 1.1 means 110%
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
          apr: +(await statisticService().getAssetAPR(Network.ETH, asset.token)), // APY, 1.1 means 110%
          totalStaked: +num(await statisticService().getAssetLiquidity(Network.ETH, asset.token))
            .dividedBy(1000000)
            .toFixed(2), // Total valued lock in USD 
        })),
      ]

      success(ctx, {
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
      })
    }
  }
}
