import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { uniq } from 'lodash'
import { Repository, getConnection } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { num } from 'lib/num'
import { getTokenBalance } from 'lib/mirror'
import {
  GovService,
  AssetService,
  PriceService,
  TerraStatisticService,
  EthStatisticService,
  // BscStatisticService,
} from 'services'
import { DailyStatisticEntity, RewardEntity } from 'orm'
import { Statistic, PeriodStatistic, ValueAt, AccountBalance, APR } from 'graphql/schema'
import { Network, AssetStatus } from 'types'

@Service()
export class StatisticService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => PriceService) private readonly priceService: PriceService,
    @Inject((type) => TerraStatisticService) private readonly terraStatisticService: TerraStatisticService,
    @Inject((type) => EthStatisticService) private readonly ethStatisticService: EthStatisticService,
    // @Inject((type) => BscStatisticService) private readonly bscStatisticService: BscStatisticService,
    @InjectRepository(DailyStatisticEntity)
    private readonly dailyRepo: Repository<DailyStatisticEntity>,
    @InjectRepository(RewardEntity) private readonly rewardRepo: Repository<RewardEntity>
  ) {}

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async statistic(network: Network): Promise<Partial<Statistic>> {
    const collateralRatio = num(await this.terraStatisticService.collateralValue())
      .dividedBy(await this.terraStatisticService.assetMarketCap())
      .toFixed(4)
    const stat = {
      network,
      collateralRatio,
      mirPrice: await this.priceService.getPrice(this.govService.get().mirrorToken),
      mirSupply: await this.terraStatisticService.mirSupply(),
    }

    if (network === Network.TERRA) {
      return {
        ...stat,
        totalValueLocked: await this.terraStatisticService.totalValueLocked(),
        assetMarketCap: await this.terraStatisticService.assetMarketCap(),
      }
    } else if (network === Network.ETH) {
      return {
        ...stat,
        totalValueLocked: await this.ethStatisticService.totalValueLocked(),
        assetMarketCap: await this.ethStatisticService.assetMarketCap(),
      }
    // } else if (network === Network.BSC) {
    //   return {
    //     totalValueLocked: await this.bscStatisticService.totalValueLocked(),
    //     assetMarketCap: await this.bscStatisticService.assetMarketCap(),
    //     ...stat,
    //   }
    } else if (network === Network.COMBINE) {
      const tvls = [
        await this.terraStatisticService.totalValueLocked(),
        await this.ethStatisticService.totalValueLocked(),
        // await this.bscStatisticService.totalValueLocked(),
      ]
      const assetMarketCaps = [
        await this.terraStatisticService.assetMarketCap(),
        await this.ethStatisticService.assetMarketCap(),
        // await this.bscStatisticService.assetMarketCap(),
      ]

      return {
        ...stat,
        totalValueLocked: {
          total: tvls.reduce((result, tvl) => result.plus(tvl.total), num(0)).toString(),
          liquidity: tvls.reduce((result, tvl) => result.plus(tvl.liquidity), num(0)).toString(),
          collateral: tvls.reduce((result, tvl) => result.plus(tvl.collateral), num(0)).toString(),
          stakedMir: tvls.reduce((result, tvl) => result.plus(tvl.stakedMir), num(0)).toString(),
        },
        assetMarketCap: assetMarketCaps.reduce((result, assetMarketCap) => result.plus(assetMarketCap), num(0)).toString(),
      }
    }
  }

  async today(network: Network): Promise<PeriodStatistic> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.today()
    } else if (network === Network.ETH) {
      return this.ethStatisticService.today()
    // } else if (network === Network.BSC) {
    //   return this.bscStatisticService.today()
    } else if (network === Network.COMBINE) {
      const statistics = [
        await this.terraStatisticService.today(),
        await this.ethStatisticService.today(),
        // await this.bscStatisticService.today(),
      ]

      return {
        transactions: statistics.reduce((result, stat) => result.plus(stat.transactions), num(0)).toString(),
        volume: statistics.reduce((result, stat) => result.plus(stat.volume), num(0)).toString(),
        feeVolume: statistics.reduce((result, stat) => result.plus(stat.feeVolume), num(0)).toString(),
        mirVolume: statistics.reduce((result, stat) => result.plus(stat.mirVolume), num(0)).toString(),
        activeUsers: statistics.reduce((result, stat) => result.plus(stat.activeUsers), num(0)).toString(),
      }
    }
  }

  async latest24h(network: Network): Promise<PeriodStatistic> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.latest24h()
    } else if (network === Network.ETH) {
      return this.ethStatisticService.latest24h()
    // } else if (network === Network.BSC) {
    //   return this.bscStatisticService.latest24h()
    } else if (network === Network.COMBINE) {
      const statistics = [
        await this.terraStatisticService.latest24h(),
        await this.ethStatisticService.latest24h(),
        // await this.bscStatisticService.latest24h(),
      ]

      return {
        transactions: statistics.reduce((result, stat) => result.plus(stat.transactions), num(0)).toString(),
        volume: statistics.reduce((result, stat) => result.plus(stat.volume), num(0)).toString(),
        feeVolume: statistics.reduce((result, stat) => result.plus(stat.feeVolume), num(0)).toString(),
        mirVolume: statistics.reduce((result, stat) => result.plus(stat.mirVolume), num(0)).toString(),
        activeUsers: statistics.reduce((result, stat) => result.plus(stat.activeUsers), num(0)).toString(),
      }
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getGovAPR(): Promise<string> {
    const period = 15 // days
    const to = Date.now()
    const from = Date.now() - (60000 * 60 * 24 * period) // 15days ago

    // gov stake reward = ((7days reward amount) / 7 * 365) / (staked to gov MIR amount)
    const govEntity = this.govService.get()
    const reward = (
      await this.rewardRepo
        .createQueryBuilder()
        .select('sum(amount)', 'amount')
        .where(
          'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
          { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
        )
        .andWhere('token = :token', { token: govEntity.mirrorToken })
        .andWhere('is_gov_reward = true')
        .getRawOne()
    )?.amount
    const govStakedMir = await getTokenBalance(govEntity.mirrorToken, govEntity.gov)
    const govAPR = num(reward).dividedBy(period).multipliedBy(365).dividedBy(govStakedMir)

    return !govAPR.isNaN() ? govAPR.toString() : '0'
  }

  async addDailyTradingVolume(
    timestamp: number,
    volume: string,
    repo = this.dailyRepo
  ): Promise<DailyStatisticEntity> {
    const datetime = new Date(timestamp - (timestamp % 86400000))
    let daily = await repo.findOne({ datetime })

    if (daily) {
      daily.tradingVolume = num(daily.tradingVolume).plus(volume).toString()
    } else {
      daily = new DailyStatisticEntity({
        gov: this.govService.get(),
        datetime,
        tradingVolume: volume,
      })
    }

    return repo.save(daily)
  }

  async calculateDailyCumulativeLiquidity(
    timestamp: number,
    repo = this.dailyRepo
  ): Promise<DailyStatisticEntity> {
    const datetime = new Date(timestamp - (timestamp % 86400000))
    const assets = await this.assetService.getAll(
      { where: [{ status: AssetStatus.LISTED }, { status: AssetStatus.DELISTED }, { status: AssetStatus.PRE_IPO }]}
    )
    let liquidityValue = num(0)

    await bluebird.map(
      assets.filter((asset) => asset.token !== 'uusd'),
      async (asset) => {
        const { pool, uusdPool } = asset.positions

        if (pool !== '0' && uusdPool != '0') {
          liquidityValue = liquidityValue
              .plus(num(uusdPool).dividedBy(pool).multipliedBy(pool))
              .plus(uusdPool)
        }
      }
    )

    const daily =
      (await repo.findOne({ datetime })) ||
      new DailyStatisticEntity({ gov: this.govService.get(), datetime })

    daily.cumulativeLiquidity = liquidityValue.toString()

    return repo.save(daily)
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getLiquidityHistory(network: Network, from: number, to: number): Promise<ValueAt[]> {
    const fromDayUTC = Math.max(from - (from % 86400000), 1606953600000)
    const toDayUTC = to - (to % 86400000)

    if (network === Network.TERRA) {
      return this.terraStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)
    // } else if (network === Network.BSC) {
    //   return this.bscStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.COMBINE) {
      const terra = (await this.terraStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC))
        .sort((a, b) => +b.timestamp - +a.timestamp)
      const eth = (await this.ethStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC))
        .sort((a, b) => +b.timestamp - +a.timestamp)
      // const bsc = (await this.bscStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC))
      //   .sort((a, b) => +b.timestamp - +a.timestamp)
      const timestamps = uniq([
        ...terra.map((data) => +data.timestamp),
        ...eth.map((data) => +data.timestamp),
        // ...bsc.map((data) => +data.timestamp)
      ]).sort((a, b) => a - b)
      const findLatestValue = (array, timestamp) => array.find((data) => +data.timestamp <= +timestamp)?.value || 0

      return bluebird.mapSeries(timestamps, (timestamp) => ({
        timestamp: +timestamp,
        value: num(findLatestValue(terra, timestamp)).plus(findLatestValue(eth, timestamp)).toFixed(0)
      }))
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getTradingVolumeHistory(network: Network, from: number, to: number): Promise<ValueAt[]> {
    const fromDayUTC = Math.max(from - (from % 86400000), 1606953600000)
    const toDayUTC = to - (to % 86400000)

    if (network === Network.TERRA) {
      return this.terraStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    // } else if (network === Network.BSC) {
    //   return this.bscStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
      const eth = await this.ethStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
      // const bsc = await this.bscStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)

      return bluebird.mapSeries(terra, (data) => ({
        timestamp: +data.timestamp,
        value: num(data.value)
          .plus(eth.find((ethData) => +ethData.timestamp === +data.timestamp)?.value || 0)
          // .plus(bsc.find((bscData) => +bscData.timestamp === +data.timestamp)?.value || 0)
          .toString()
      }))
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getFeeHistory(network: Network, from: number, to: number): Promise<ValueAt[]> {
    const fromDayUTC = Math.max(from - (from % 86400000), 1606953600000)
    const toDayUTC = to - (to % 86400000)
    let values = []

    if (network === Network.TERRA) {
      values = await this.terraStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.ETH) {
      values = await this.ethStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    // } else if (network === Network.BSC) {
    //   values = await this.bscStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
      const eth = await this.ethStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
      // const bsc = await this.bscStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)

      values = await bluebird.mapSeries(terra, (data) => ({
        timestamp: +data.timestamp,
        value: num(data.value)
          .plus(eth.find((ethData) => +ethData.timestamp === +data.timestamp)?.value || 0)
          // .plus(bsc.find((bscData) => +bscData.timestamp === +data.timestamp)?.value || 0)
          .toString()
      }))
    }

    return bluebird.mapSeries(values, (data) => ({
      timestamp: +data.timestamp,
      value: num(data.value).multipliedBy(0.003).toFixed(0)
    }))
  }

  async getAssetDayVolume(network: Network, token: string, timestamp: number): Promise<string> {
    const dayUTC = timestamp - (timestamp % 86400000)

    if (network === Network.TERRA) {
      return this.terraStatisticService.getAssetDayVolume(token, dayUTC)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getAssetDayVolume(token, dayUTC)
    // } else if (network === Network.BSC) {
    //   return this.bscStatisticService.getAssetDayVolume(token, dayUTC)
    } else if (network === Network.COMBINE) {
      const statistics = [
        await this.terraStatisticService.getAssetDayVolume(token, dayUTC),
        await this.ethStatisticService.getAssetDayVolume(token, dayUTC),
        // await this.bscStatisticService.getAssetDayVolume(token, dayUTC),
      ]

      return statistics.reduce((result, stat) => result.plus(stat), num(0)).toString()
    }
  }

  async getAsset24h(network: Network, token: string): Promise<{ volume: string; transactions: string }> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.getAsset24h(token)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getAsset24h(token)
    // } else if (network === Network.BSC) {
    //   return this.bscStatisticService.getAsset24h(token)
    } else if (network === Network.COMBINE) {
      const statistics = [
        await this.terraStatisticService.getAsset24h(token),
        await this.ethStatisticService.getAsset24h(token),
        // await this.bscStatisticService.getAsset24h(token),
      ]

      return {
        volume: statistics.reduce((result, stat) => result.plus(stat.volume), num(0)).toString(),
        transactions: statistics.reduce((result, stat) => result.plus(stat.transactions), num(0)).toString(),
      }
    }

    return { volume: '0', transactions: '0' }
  }

  async getAssetLiquidity(network: Network, token: string): Promise<string> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.getAssetLiquidity(token)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getAssetLiquidity(token)
    // } else if (network === Network.BSC) {
    //   return this.bscStatisticService.getAssetLiquidity(token)
    } else if (network === Network.COMBINE) {
      const statistics = [
        await this.terraStatisticService.getAssetLiquidity(token),
        await this.ethStatisticService.getAssetLiquidity(token),
        // await this.bscStatisticService.getAssetLiquidity(token),
      ]

      return statistics.reduce((result, stat) => result.plus(stat), num(0)).toString()
    }

    return '0'
  }

  async getAssetShortValue(network: Network, token: string): Promise<string> {
    if (network === Network.TERRA || network === Network.COMBINE) {
      return this.terraStatisticService.getAssetShortValue(token)
    }

    return '0'
  }

  async getAssetAPR(network: Network, token: string): Promise<APR> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.getAssetAPR(token)
    } else if (network === Network.ETH) {
      return {
        long: await this.ethStatisticService.getAssetAPR(token),
        short: '0'
      }
    }

    return { long: '0', short: '0' }
  }

  @memoize({ promise: true, maxAge: 60000 * 10, preFetch: true }) // 10 minutes
  async richlist(token: string, offset: number, limit: number): Promise<AccountBalance[]> {
    // SELECT * FROM (
    //   SELECT DISTINCT ON (address) address,token,balance
    //   FROM balance
    //   WHERE token='terra14y5affaarufk3uscy2vr6pe6w6zqf2wpjzn5sh'
    //   ORDER BY address, id DESC  -- get latest balance per address
    // ) b
    // WHERE balance > 0
    // ORDER BY balance DESC;
    return getConnection()
      .createQueryBuilder()
      .select('b.address', 'address')
      .addSelect('b.balance', 'balance')
      .from(
        (subQuery) =>
          subQuery
            .select('DISTINCT ON (address) address, balance')
            .from('balance', 'balance')
            .where('token = :token', { token })
            .orderBy('address')
            .addOrderBy('id', 'DESC'),
        'b'
      )
      .where('balance > 0')
      .orderBy('balance', 'DESC')
      .skip(offset)
      .take(limit)
      .getRawMany()
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getAssetMarketCap(network: Network, token: string): Promise<string> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.assetMarketCap(token)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.assetMarketCap(token)
    } else if (network === Network.COMBINE) {
      const assetMarketCaps = [
        await this.terraStatisticService.assetMarketCap(token),
        await this.ethStatisticService.assetMarketCap(token),
        // await this.bscStatisticService.assetMarketCap(token),
      ]

      return assetMarketCaps.reduce((result, assetMarketCap) => result.plus(assetMarketCap), num(0)).toString()
    }
  }
}

export function statisticService(): StatisticService {
  return Container.get(StatisticService)
}
